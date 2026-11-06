import {randomUUID} from 'node:crypto';
import {database,transaction} from './db.mjs';
import {AppError,assert,text,money,url} from './domain.mjs';
import * as svc from './service.mjs';
import {appOrigin,requireAdmin,login,sessionCookies,cookies,authFetch,reauthenticate} from './auth.mjs';
import {validateImport,commitImport,exportBooks} from './excel.mjs';
const json=(data,status=200)=>Response.json({data},{status,headers:{'Cache-Control':'no-store'}});
export async function handle(request,segments,provider=null) {
  const path=segments.join('/'),method=request.method,requestId=randomUUID(); let admin;
  try {
    if(method!=='GET') {
      const allowedOrigin = appOrigin();
      assert(allowedOrigin && request.headers.get('origin') === allowedOrigin, 'Nguồn yêu cầu không được phép.', 403, 'CSRF_REJECTED');
      const size=Number(request.headers.get('content-length')||0); assert(size<=7*1024*1024,'Yêu cầu quá lớn.',413);
    }
    const db=provider||database();
    let p={};
    if(!['GET','HEAD'].includes(method)&&!request.headers.get('content-type')?.startsWith('multipart/')) {
      const raw=await request.text(); assert(raw.length<=1024*1024,'JSON quá lớn.',413); p=raw?JSON.parse(raw):{};
    }
    if(path==='public/books'&&method==='GET') return json(await svc.publicBooks(db));
    if(path==='public/content'&&method==='GET') {
      return json({settings:(await svc.one(db,"select value from library.system_settings where key='library'")).value,
        links:await svc.rows(db,'select * from library.content_links where active order by sort_order'),sections:await svc.rows(db,'select * from library.content_sections')});
    }
    if(path==='public/events'&&method==='POST') {
      assert(['click_borrow_book_btn','copy_book_info','redirect_zalo_oa','click_drive_folder'].includes(p.event),'Sự kiện không hợp lệ.');
      const target=text(p.target||'general','Đích',100); assert(/^[\w-]+$/.test(target),'Đích không hợp lệ.');
      await db.query("insert into library.analytics_daily(date,event_name,target_key,count) values((now() at time zone 'Asia/Ho_Chi_Minh')::date,$1,$2,1) on conflict(date,event_name,target_key) do update set count=least(library.analytics_daily.count+1,1000000)",[p.event,target]); return json({recorded:true});
    }
    if(path==='auth/login'&&method==='POST') {
      const session=await login(request,db,p); await svc.audit(db,session.user.id,'LOGIN','admin_accounts',session.user.id,null,null);
      const response=json({email:session.user.email}); sessionCookies(response,session); return response;
    }
    if(path==='auth/logout'&&method==='POST') {
      const jar=cookies(request),token=jar.lamour_access;
      if(token) await authFetch('logout',null,token).catch(()=>{});
      if(jar.lamour_session)await db.query('update library.admin_sessions set revoked_at=now() where token_hash=$1',[svc.hash(jar.lamour_session)]);
      const response=json({loggedOut:true}); sessionCookies(response,null); return response;
    }
    admin=await requireAdmin(request,db);
    let response;
    if(path==='auth/session'&&method==='GET') response=json({email:admin.email});
    else if(path==='admin/state'&&method==='GET') response=json(await transaction(async c=>{await c.query('set transaction isolation level repeatable read read only');return svc.state(c);},db));
    else if(path==='admin/reminders'&&method==='GET') response=json(await svc.reminders(db,admin.id));
    else if(path==='admin/book-export'&&method==='GET') {
      const buf=await exportBooks(db,new URL(request.url).searchParams.get('template')==='1');
      response=new Response(buf,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="lamour-books.xlsx"','Cache-Control':'no-store'}});
    } else if(path==='admin/book-imports/validate'&&method==='POST') {
      const form=await request.formData(),file=form.get('file'); assert(file&&file.size>0&&file.size<=5*1024*1024,'Chọn file .xlsx tối đa 5MB.');
      assert(file.name.endsWith('.xlsx'),'Chỉ nhận .xlsx.'); const buffer=Buffer.from(await file.arrayBuffer());
      response=json(await transaction(c=>validateImport(c,admin.id,buffer,form.get('mode'))));
    } else if(path==='admin/backups/export'&&method==='POST') {
      await reauthenticate(db,admin,p.password);
      const backup=await transaction(async c=>{
        await c.query('set transaction isolation level repeatable read');
        const tables=await svc.rows(c,"select tablename from pg_tables where schemaname='library' and tablename not in ('auth_attempts','idempotency_records','admin_accounts','admin_sessions') order by tablename");
        const data={}; for(const t of tables) data[t.tablename]=await svc.rows(c,`select * from library.${t.tablename}`);
        const payload={schemaVersion:2,appVersion:'1.0.0',createdAt:new Date().toISOString(),timezone:'Asia/Ho_Chi_Minh',data};
        const checksum=svc.hash(payload); await c.query("insert into library.backup_runs(status,checksum,row_counts) values('EXPORTED',$1,$2)",[checksum,JSON.stringify(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])))]);
        await svc.audit(c,admin.id,'BACKUP_EXPORT','backup_runs',null,null,{checksum}); return {payload,checksum};
      });
      response=new Response(JSON.stringify(backup,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="lamour-backup.json"','Cache-Control':'no-store'}});
    } else if(path==='admin/account'&&method==='PATCH') {
      await reauthenticate(db,admin,p.currentPassword); assert(typeof p.password==='string'&&p.password.length>=12,'Mật khẩu mới ít nhất 12 ký tự.');
      await authFetch('user',{password:p.password},admin.token,'PUT');
      await db.query('update library.admin_sessions set revoked_at=now() where account_id=$1 and revoked_at is null',[admin.id]);
      await svc.audit(db,admin.id,'PASSWORD_CHANGE','admin_accounts',admin.id,null,null); response=json({changed:true});sessionCookies(response,null);return response;
    } else {
      assert(method==='POST'||method==='PATCH','Không tìm thấy API.',404);
      const key=request.headers.get('idempotency-key');
      response=json(await transaction(c=>svc.idempotent(c,admin.id,path,key,p,async()=>{
        if(path==='admin/book-titles'&&method==='POST') return svc.createBook(c,admin.id,p);
        if(path==='admin/readers'&&method==='POST') return svc.createReader(c,admin.id,p);
        if(path==='admin/copies'&&method==='POST') { const cp=await svc.addCopy(c,p.titleId,p); await svc.audit(c,admin.id,'CREATE','book_copies',cp.id,null,cp); return cp; }
        if(path==='admin/copies/status') return svc.changeCopy(c,admin.id,p);
        if(path==='admin/book-titles/visibility') {
          assert(typeof p.visible==='boolean','Hiển thị web không hợp lệ.');
          const old=await svc.one(c,'select * from library.book_titles where id=$1 for update',[p.id]); assert(old,'Không tìm thấy đầu sách.',404);
          assert(old.version===p.version,'Đầu sách đã thay đổi.',409);
          const b=await svc.one(c,'update library.book_titles set show_on_web=$2,version=version+1,updated_at=now() where id=$1 returning *',[p.id,p.visible]);
          await svc.audit(c,admin.id,'VISIBILITY','book_titles',p.id,old,b); return b;
        }
        if(path==='admin/loans/quote') { const q=await svc.loanQuote(c,p); return {dueDate:q.dueDate,deposit:q.deposit,overdue:q.overdue,policyVersion:q.policy.version,quoteToken:svc.loanQuoteToken(q)}; }
        if(path==='admin/loans/issue') return svc.issueLoan(c,admin.id,p,key);
        if(path==='admin/returns/quote') {
          const q=await svc.returnQuote(c,p); const {version,itemId,...calc}=q; return {...q,quoteHash:svc.hash(calc)};
        }
        if(path==='admin/returns') return svc.returnBook(c,admin.id,p,key);
        if(path==='admin/settlements/quote') {const q=await svc.settlementQuote(c,p);return {...q,quoteHash:svc.hash(q)};}
        if(path==='admin/settlements') return svc.settlePending(c,admin.id,p,key);
        if(path==='admin/transactions/reverse') return svc.reverseTransfer(c,admin.id,p,key);
        if(path==='admin/replacements') return svc.receiveReplacement(c,admin.id,p);
        if(path==='admin/settings') return svc.saveSettings(c,admin.id,p);
        if(path==='admin/transfers') return svc.transfer(c,admin.id,p,key);
        if(path==='admin/contacts') {
          const r=await svc.one(c,'insert into library.collection_contacts(loan_id,channel,content,result,next_followup_on,created_by) values($1,$2,$3,$4,$5,$6) returning *',[p.loanId,text(p.channel,'Kênh',100,true),text(p.content,'Nội dung',5000,true),text(p.result,'Kết quả',2000,true),p.nextDate||null,admin.id]);
          await svc.audit(c,admin.id,'CONTACT','collection_contacts',r.id,null,r); return r;
        }
        if(path==='admin/reminders/acknowledge') {
          const r=await svc.one(c,"update library.reminder_events set status='ACKNOWLEDGED',acknowledged_at=now() where id=$1 returning *",[p.id]); assert(r,'Không tìm thấy nhắc hạn.',404); return r;
        }
        if(path==='admin/book-imports/commit') return commitImport(c,admin.id,p.jobId);
        if(path==='admin/content-links') {
          const link=await svc.one(c,`insert into library.content_links(key,label,url,qr_url,year,active,sort_order) values($1,$2,$3,$4,$5,$6,$7)
            on conflict(key) do update set label=excluded.label,url=excluded.url,qr_url=excluded.qr_url,year=excluded.year,active=excluded.active returning *`,[text(p.key,'Mã link',100,true),text(p.label,'Tên link',300,true),url(p.url),url(p.qrUrl||''),p.year||null,p.active!==false,p.sortOrder||0]);
          await svc.audit(c,admin.id,'CONTENT_LINK','content_links',link.key,null,link); return link;
        }
        if(path==='admin/content') {
          assert(['home','isov','data'].includes(p.page),'Trang không hợp lệ.');
          const value={title:text(p.title,'Tiêu đề',500,true),description:text(p.description,'Mô tả',5000,true)};
          const r=await svc.one(c,"insert into library.content_sections(page_key,section_key,structured_content) values($1,'hero',$2) on conflict(page_key,section_key) do update set structured_content=excluded.structured_content,published_version=library.content_sections.published_version+1 returning *",[p.page,JSON.stringify(value)]);
          await svc.audit(c,admin.id,'CONTENT','content_sections',p.page,null,r); return r;
        }
        if(path==='admin/wallets') {
          const type=p.type; assert(['MOMO','BANK','CASH','OTHER'].includes(type),'Loại ví không hợp lệ.'); money(p.openingBalance||0);
          const w=await svc.one(c,`insert into library.wallets(code,display_name,type,account_holder,account_number,bank_name,qr_url,opening_balance_vnd) values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,[text(p.code,'Mã ví',30,true),text(p.name,'Tên ví',200,true),type,text(p.holder||'','Chủ tài khoản',200),text(p.account||'','Số tài khoản',100),text(p.bank||'','Ngân hàng',200),url(p.qrUrl||''),p.openingBalance||0]);
          await svc.audit(c,admin.id,'CREATE','wallets',w.id,null,w); return w;
        }
        if(path==='admin/print-documents') return svc.printSnapshot(c,admin.id,p.loanId,'STATEMENT');
        throw new AppError('Không tìm thấy API.',404,'NOT_FOUND');
      })));
    }
    if(admin?.refresh) sessionCookies(response,admin.refresh);
    return response;
  } catch(e) {
    let status=e.status||500,code=e.code||'INTERNAL_ERROR',message=e.message;
    if(e.code==='23505') {status=409;code='DUPLICATE';message='Mã hoặc số điện thoại đã tồn tại.';}
    else if(e.code==='22P02'||e.code==='23503'||e.code==='23514'||e instanceof SyntaxError) {status=422;code='INVALID_DATA';message='Dữ liệu không hợp lệ hoặc liên kết không tồn tại.';}
    if(status===500) {message='Không thể xử lý. Kiểm tra cấu hình máy chủ/database hoặc thử lại.'; console.error(requestId,e.code||e.name);}
    return Response.json({error:{code,message,requestId}},{status,headers:{'Cache-Control':'no-store'}});
  }
}

import {createHash,randomUUID} from 'node:crypto';
import {assert,text,money,date,today,addMonths,phone,url,settlement,AppError} from './domain.mjs';
export async function rows(c,sql,params=[]) { return (await c.query(sql,params)).rows; }
export async function one(c,sql,params=[]) { return (await rows(c,sql,params))[0]; }
export function hash(value) { return createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex'); }
export async function audit(c,actor,action,table,id,before,after,reason='') {
  await c.query('insert into library.audit_logs(actor_id,action,target_table,target_id,before_data,after_data,reason,request_id) values($1,$2,$3,$4,$5,$6,$7,$8)',[actor,action,table,id,JSON.stringify(before??null),JSON.stringify(after??null),reason,randomUUID()]);
}
export async function idempotent(c,actor,scope,key,payload,fn) {
  assert(typeof key==='string' && key.length>=16 && key.length<=100,'Thiếu Idempotency-Key.',400);
  await c.query('select pg_advisory_xact_lock(hashtext($1))',[actor+scope+key]);
  const prev=await one(c,'select * from library.idempotency_records where actor=$1 and scope=$2 and key=$3',[actor,scope,key]);
  const digest=hash(payload);
  if(prev) { assert(prev.request_hash===digest,'Mã yêu cầu đã dùng với nội dung khác.',409,'IDEMPOTENCY_CONFLICT'); return prev.result; }
  const result=await fn();
  await c.query('insert into library.idempotency_records(actor,scope,key,request_hash,result) values($1,$2,$3,$4,$5)',[actor,scope,key,digest,JSON.stringify(result)]);
  return result;
}
export async function nextCode(c,kind,prefix) {
  const allowed=['title','reader','loan','receipt','transaction']; assert(allowed.includes(kind),'Mã không hợp lệ.');
  const table={title:'book_titles',reader:'readers',loan:'loans',receipt:'return_receipts',transaction:'financial_transactions'}[kind];
  for(;;){const r=await one(c,`select nextval('library.${kind}_seq') as n`);const code=prefix+String(r.n).padStart(3,'0');if(!await one(c,`select id from library.${table} where code=$1`,[code]))return code;}
}
export async function addCopy(c,titleId,input={}) {
  const t=await one(c,'select * from library.book_titles where id=$1 and archived_at is null for update',[titleId]); assert(t,'Không tìm thấy đầu sách.',404);
  const n=await one(c,"select coalesce(max(substring(code from '[0-9]+$')::integer),0)+1 n from library.book_copies where title_id=$1",[titleId]);
  return one(c,`insert into library.book_copies(code,title_id,physical_condition,media_type,shelf_location,condition_note,acquired_on,acquisition_note,replacement_for_copy_id)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,[t.code+'-'+String(n.n).padStart(3,'0'),titleId,input.condition||'Tốt',input.mediaType||'Sách',input.shelf||'',input.note||'',input.acquiredOn||today(),input.acquisitionNote||'',input.replacementFor||null]);
}
export async function createBook(c,actor,p) {
  if(p.importCode) assert(/^DS\d{3,}$/.test(p.importCode),'Mã đầu sách không hợp lệ.');
  const title=text(p.title,'Tên đầu sách',500,true), author=text(p.author||'','Tác giả',500);
  const category=text(p.category||'Chưa phân loại','Thể loại',200,true);
  const cat=await one(c,'insert into library.book_categories(name) values($1) on conflict(name) do update set name=excluded.name returning id',[category]);
  const count=p.copiesCount??0; assert(Number.isInteger(count)&&count>=0&&count<=100,'Số cuốn ban đầu từ 0 đến 100.');
  if(p.price!=null) money(p.price,'Giá bìa'); if(p.pages!=null) assert(Number.isInteger(p.pages)&&p.pages>0,'Số trang phải lớn hơn 0.');
  assert(['IN_PRINT','OUT_OF_PRINT','UNKNOWN'].includes(p.publishStatus||'UNKNOWN'),'Tình trạng phát hành không hợp lệ.');
  assert(!p.languageGroup || ['VIETNAMESE','FOREIGN'].includes(p.languageGroup),'Nhóm ngôn ngữ không hợp lệ.');
  const b=await one(c,`insert into library.book_titles(code,title,authors,category_id,publisher,language,compensation_language_group,acquired_on,publication_year,isbn,page_count,cover_price_vnd,publication_status,cover_url,short_description,description,show_on_web)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning *`,[
    p.importCode||await nextCode(c,'title','DS'),title,author,cat.id,text(p.publisher||'','Nhà xuất bản',300),text(p.language||'Tiếng Việt','Ngôn ngữ',100),p.languageGroup||null,p.acquiredOn?date(p.acquiredOn):today(),p.year||null,text(p.isbn||'','ISBN',100),p.pages??null,p.price??null,p.publishStatus||'UNKNOWN',url(p.coverUrl||''),text(p.description||'','Mô tả',10000),text(p.fullDescription||p.description||'','Mô tả đầy đủ',50000),p.showOnWeb===true]);
  for(let i=0;i<count;i++) await addCopy(c,b.id,{shelf:text(p.shelf||'','Vị trí kệ',200)});
  await audit(c,actor,'CREATE','book_titles',b.id,null,b); return b;
}
export async function createReader(c,actor,p) {
  const category=p.category; assert(['COMPANY','INTERNAL','WALK_IN'].includes(category),'Phân loại khách không hợp lệ.');
  const r=await one(c,`insert into library.readers(code,full_name,phone_normalized,phone_display,reader_category,policy_group_default,address,email,organization,notes)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,[await nextCode(c,'reader','DG'),text(p.name,'Họ tên',300,true),phone(p.phone),p.phone,category,category==='WALK_IN'?'WALK_IN':'COMPANY',text(p.address||'','Địa chỉ',1000),text(p.email||'','Email',320),text(p.organization||'','Cơ sở',300),text(p.note||'','Ghi chú',3000)]);
  await audit(c,actor,'CREATE','readers',r.id,null,r); return r;
}
export async function policy(c) { return one(c,'select * from library.policy_versions order by version desc limit 1'); }
export async function checkWallet(c,id) {
  const w=await one(c,'select * from library.wallets where id=$1 and active for update',[id]); assert(w,'Chọn ví đang sử dụng.'); return w;
}
export async function financial(c,actor,type,loan,amount,key,reason,reversalId=null) {
  return one(c,`insert into library.financial_transactions(code,type,loan_id,reader_id,amount_vnd,idempotency_key,reason,created_by,reversal_of_id)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,[await nextCode(c,'transaction','GD'),type,loan?.id||null,loan?.reader_id||null,amount,key,reason,actor,reversalId]);
}
async function cash(c,tx,wallet,direction,amount) {
  if(!amount) return;
  await checkWallet(c,wallet);
  if(direction==='OUT') {
    const b=await one(c,`select w.opening_balance_vnd+coalesce(sum(case when e.direction='IN' then e.amount_vnd else -e.amount_vnd end),0) balance from library.wallets w left join library.cash_entries e on e.wallet_id=w.id where w.id=$1 group by w.id`,[wallet]);
    assert(Number(b.balance)>=amount,'Số dư ví không đủ để chi.');
  }
  await c.query('insert into library.cash_entries(transaction_id,wallet_id,direction,amount_vnd) values($1,$2,$3,$4)',[tx,wallet,direction,amount]);
}
async function deposit(c,tx,item,direction,purpose,amount) {
  if(!amount) return;
  await c.query('insert into library.deposit_entries(transaction_id,loan_item_id,direction,purpose,amount_vnd) values($1,$2,$3,$4,$5)',[tx,item,direction,purpose,amount]);
}
export async function loanQuote(c,p) {
  date(p.borrowDate); assert(p.borrowDate<=today(),'Ngày mượn không được ở tương lai.');
  assert(Array.isArray(p.copyIds)&&p.copyIds.length>0&&p.copyIds.length<=100&&new Set(p.copyIds).size===p.copyIds.length,'Chọn từ 1 đến 100 cuốn, không trùng.');
  const reader=await one(c,'select * from library.readers where id=$1 and archived_at is null',[p.readerId]); assert(reader,'Độc giả không tồn tại.',404);
  assert(reader.account_status==='Hoạt động','Hồ sơ độc giả bị khóa.');
  const pol=await policy(c), copies=await rows(c,`select c.*,row_to_json(t) title from library.book_copies c join library.book_titles t on t.id=c.title_id where c.id=any($1::uuid[]) order by c.id`,[p.copyIds]);
  assert(copies.length===p.copyIds.length&&copies.every(x=>x.status==='READY'&&!x.title.archived_at),'Có cuốn không còn sẵn sàng.',409,'COPY_NOT_AVAILABLE');
  const overdue=await one(c,`select count(*) n from library.loan_items i join library.loans l on l.id=i.loan_id where l.reader_id=$1 and i.resolution_status='OPEN' and i.due_on<$2`,[reader.id,today()]);
  const group=reader.policy_group_default, per=group==='COMPANY'?0:Number(pol.walkin_deposit_vnd);
  return {reader,policy:pol,copies,dueDate:addMonths(p.borrowDate,group==='COMPANY'?pol.company_term_months:pol.walkin_term_months),deposit:per*copies.length,perCopyDeposit:per,overdue:Number(overdue.n)};
}
export async function issueLoan(c,actor,p,key) {
  // Stable ordered row locks serialize checkout of the same physical copies.
  assert(Array.isArray(p.copyIds),'Thiếu danh sách cuốn.');
  await rows(c,'select id from library.book_copies where id=any($1::uuid[]) order by id for update',[p.copyIds]);
  const q=await loanQuote(c,p);
  assert(p.quoteToken===loanQuoteToken(q),'Chính sách hoặc cuốn sách đã thay đổi; xem lại báo giá.',409,'QUOTE_CHANGED');
  assert(!q.overdue||p.warningAcknowledged===true,'Cần xác nhận đã đọc cảnh báo quá hạn.');
  if(q.deposit) { assert(p.depositConfirmed===true,'Cần xác nhận đã nhận đủ tiền cọc.'); await checkWallet(c,p.walletId); }
  text(p.conditionNote,'Tình trạng bàn giao',2000,true);
  const l=await one(c,`insert into library.loans(code,reader_id,policy_version_id,reader_snapshot,policy_group_snapshot,category_snapshot,borrowed_on,due_on,warning_acknowledged_at,verification_note,notes,delivery_method,created_by)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,[await nextCode(c,'loan','PM'),q.reader.id,q.policy.id,JSON.stringify(q.reader),q.reader.policy_group_default,q.reader.reader_category,p.borrowDate,q.dueDate,p.warningAcknowledged?new Date():null,p.verificationNote||'',p.notes||'',p.deliveryMethod||'Tại quầy',actor]);
  const tx=q.deposit?await financial(c,actor,'COLLECT_DEPOSIT',l,q.deposit,key+':deposit','Thu cọc khi bàn giao sách'):null;
  if(tx) await cash(c,tx.id,p.walletId,'IN',q.deposit);
  for(const cp of q.copies) {
    const i=await one(c,`insert into library.loan_items(loan_id,copy_id,title_snapshot,condition_out,condition_out_note,due_on,deposit_required_vnd,deposit_wallet_id)
      values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,[l.id,cp.id,JSON.stringify(cp.title),cp.physical_condition,p.conditionNote,q.dueDate,q.perCopyDeposit,q.deposit?p.walletId:null]);
    if(tx) await deposit(c,tx.id,i.id,'INCREASE','COLLECT',q.perCopyDeposit);
    await c.query("update library.book_copies set status='ON_LOAN',version=version+1,updated_at=now() where id=$1",[cp.id]);
  }
  await audit(c,actor,'ISSUE','loans',l.id,null,l);
  await printSnapshot(c,actor,l.id,'BORROW'); return l;
}
export function loanQuoteToken(q){return hash({readerId:q.reader.id,readerVersion:q.reader.version,policy:q.policy.id,copies:q.copies.map(c=>[c.id,c.version]),dueDate:q.dueDate,deposit:q.deposit});}
export async function itemWithPolicy(c,itemId,lock=false) {
  const i=await one(c,`select i.*,l.borrowed_on,l.reader_id,l.code loan_code,l.policy_version_id from library.loan_items i join library.loans l on l.id=i.loan_id where i.id=$1 ${lock?'for update of i,l':''}`,[itemId]); assert(i,'Không tìm thấy dòng phiếu.',404);
  const d=await one(c,"select coalesce(sum(case when direction='INCREASE' then amount_vnd else -amount_vnd end),0) n from library.deposit_entries where loan_item_id=$1",[itemId]);
  i.deposit_held=Number(d.n); const pol=await one(c,'select * from library.policy_versions where id=$1',[i.policy_version_id]); return {item:i,policy:pol};
}
export async function returnQuote(c,p) {
  const {item,policy:pol}=await itemWithPolicy(c,p.itemId); assert(item.resolution_status==='OPEN','Cuốn này đã được xử lý.',409);
  return {...settlement(item,pol,p),version:item.version,itemId:item.id};
}
export async function returnBook(c,actor,p,key) {
  const {item:i,policy:pol}=await itemWithPolicy(c,p.itemId,true); assert(i.resolution_status==='OPEN','Cuốn đã được trả/xác nhận mất.',409);
  const calc=settlement(i,pol,p); assert(p.version===i.version,'Dữ liệu đã thay đổi, hãy xem lại báo giá.',409);
  assert(hash(calc)===p.quoteHash,'Số tiền đã thay đổi, hãy xem lại báo giá.',409);
  const reason=text(p.reason,'Ghi chú kiểm tra',2000,true); text(p.conditionIn,'Tình trạng nhận',2000,true);
  // Loss needs a deliberately chosen policy. Resolution-date charging cannot finish before replacement.
  if(calc.replacement && pol.loss_late_fee_rule==='RESOLUTION_DATE') assert(p.replacementReceived===true,'Quy tắc hiện tại yêu cầu nhận sách thay thế ngay để chốt ngày tính phí.');
  if(p.settleNow!==false&&(calc.extra||calc.refund)) { await checkWallet(c,p.walletId); assert(p.cashConfirmed===true,'Xác nhận đã thực thu/chi theo báo giá.'); }
  const r=await one(c,'insert into library.return_receipts(code,loan_id,actual_return_on,notes,created_by) values($1,$2,$3,$4,$5) returning *',[await nextCode(c,'receipt','PT'),i.loan_id,p.actualDate,reason,actor]);
  let replacement=null;
  if(calc.replacement&&p.replacementReceived===true) replacement=await addCopy(c,i.title_snapshot.id,{replacementFor:i.copy_id,note:reason});
  const state=p.outcome==='LOST'?'LOST':p.outcome==='GOOD'?'READY':'REPAIR';
  await c.query('insert into library.return_items(receipt_id,loan_item_id,outcome,condition_in,condition_note,resulting_copy_status,replacement_copy_id,decision_by,decision_reason) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[r.id,i.id,p.outcome,p.conditionIn,reason,state,replacement?.id||null,p.decisionBy||'',reason]);
  const pending=calc.replacement&&!replacement;
  await c.query('update library.loan_items set returned_on=$2,loss_confirmed_on=$3,resolution_status=$4,version=version+1,updated_at=now() where id=$1',[i.id,p.outcome==='LOST'?null:p.actualDate,p.outcome==='LOST'?p.actualDate:null,pending?'LOST_PENDING':p.settleNow===false?'RETURNED':'RESOLVED']);
  await c.query('update library.book_copies set status=$2,physical_condition=$3,version=version+1,updated_at=now() where id=$1',[i.copy_id,state,p.conditionIn]);
  const charges=[];
  for(const [type,amount] of [['LATE_FEE',calc.late],[p.outcome==='LOST'?(calc.replacement?'TECHNICAL_FEE':'LOSS_COMPENSATION'):'DAMAGE_COMPENSATION',calc.damage]]) {
    if(amount) charges.push(await one(c,'insert into library.charges(loan_item_id,receipt_id,type,amount_vnd,calculation_snapshot,decided_by,reason,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[i.id,r.id,type,amount,JSON.stringify({policy:pol,quote:calc,input:p}),p.decisionBy||'',reason,actor]));
  }
  const l={id:i.loan_id,reader_id:i.reader_id};
  if(p.settleNow!==false&&calc.applied) {
    const tx=await financial(c,actor,'APPLY_DEPOSIT',l,calc.applied,key+':apply',reason);
    await deposit(c,tx.id,i.id,'DECREASE','APPLY',calc.applied);
    let left=calc.applied;
    for(const ch of charges) { const amt=Math.min(left,Number(ch.amount_vnd)); if(amt) await c.query('insert into library.charge_allocations(transaction_id,charge_id,direction,amount_vnd) values($1,$2,\'APPLY\',$3)',[tx.id,ch.id,amt]); ch.applied=amt; left-=amt; }
  }
  if(p.settleNow!==false&&calc.refund) {
    const tx=await financial(c,actor,'REFUND_DEPOSIT',l,calc.refund,key+':refund',reason);
    await cash(c,tx.id,p.walletId,'OUT',calc.refund); await deposit(c,tx.id,i.id,'DECREASE','REFUND',calc.refund);
  }
  if(p.settleNow!==false&&calc.extra) {
    const tx=await financial(c,actor,'COLLECT_CHARGE',l,calc.extra,key+':extra',reason); await cash(c,tx.id,p.walletId,'IN',calc.extra);
    for(const ch of charges) { const amt=Number(ch.amount_vnd)-(ch.applied||0); if(amt) await c.query('insert into library.charge_allocations(transaction_id,charge_id,direction,amount_vnd) values($1,$2,\'APPLY\',$3)',[tx.id,ch.id,amt]); }
  }
  await updateLoanStatus(c,i.loan_id); await audit(c,actor,'RETURN','loan_items',i.id,i,{receipt:r,settlement:calc},reason);
  await printSnapshot(c,actor,i.loan_id,'RETURN',r.id); return {receipt:r,settlement:calc};
}
export async function updateLoanStatus(c,id) {
  const items=await rows(c,'select resolution_status from library.loan_items where loan_id=$1',[id]);
  const all=items.every(x=>x.resolution_status==='RESOLVED'); const open=items.every(x=>x.resolution_status==='OPEN');
  await c.query('update library.loans set status=$2,completed_at=$3,version=version+1,updated_at=now() where id=$1',[id,all?'COMPLETED':open?'ACTIVE':items.some(x=>['LOST_PENDING','RETURNED'].includes(x.resolution_status))?'PENDING_SETTLEMENT':'PARTIAL',all?new Date():null]);
}
export async function receiveReplacement(c,actor,p) {
  const {item:i}=await itemWithPolicy(c,p.itemId,true); assert(i.resolution_status==='LOST_PENDING','Không có nghĩa vụ thay sách đang chờ.');
  const cp=await addCopy(c,i.title_snapshot.id,{replacementFor:i.copy_id,note:text(p.reason,'Ghi nhận kiểm tra sách thay thế',2000,true)});
  // Preserve immutable original return record; record replacement as a new document/audit event.
  const balance=await settlementQuote(c,{itemId:i.id});
  await c.query('update library.loan_items set resolution_status=$2,version=version+1,updated_at=now() where id=$1',[i.id,balance.held||balance.remaining?'RETURNED':'RESOLVED']);
  await updateLoanStatus(c,i.loan_id); await audit(c,actor,'REPLACEMENT_RECEIVED','loan_items',i.id,i,cp,p.reason);
  await printSnapshot(c,actor,i.loan_id,'REPLACEMENT'); return cp;
}
export async function printSnapshot(c,actor,loanId,type,receiptId=null) {
  const l=await one(c,'select * from library.loans where id=$1',[loanId]); assert(l,'Không tìm thấy phiếu.',404);
  const items=await rows(c,`select i.*,c.code copy_code,r.outcome,r.condition_in from library.loan_items i join library.book_copies c on c.id=i.copy_id left join library.return_items r on r.loan_item_id=i.id where i.loan_id=$1 order by c.code`,[loanId]);
  const settings=await one(c,"select value from library.system_settings where key='library'");
  const transactions=await rows(c,'select * from library.financial_transactions where loan_id=$1 order by created_at',[loanId]);
  const charges=await rows(c,'select ch.* from library.charges ch join library.loan_items i on i.id=ch.loan_item_id where i.loan_id=$1',[loanId]);
  return one(c,'insert into library.print_documents(code,loan_id,receipt_id,type,snapshot,created_by) values($1,$2,$3,$4,$5,$6) returning *',[`${l.code}-${type}-${randomUUID().slice(0,8)}`,loanId,receiptId,type,JSON.stringify({loan:l,items,settings:settings.value,transactions,charges,printedAt:new Date().toISOString()}),actor]);
}
export async function changeCopy(c,actor,p) {
  assert(['READY','REPAIR','DAMAGED','LOST','RETIRED'].includes(p.status),'Không thể tự chuyển sang Đang mượn.');
  const old=await one(c,'select * from library.book_copies where id=$1 for update',[p.id]); assert(old,'Không tìm thấy cuốn.',404);
  assert(old.version===p.version,'Cuốn đã thay đổi.',409);
  const active=await one(c,"select id from library.loan_items where copy_id=$1 and resolution_status in ('OPEN','LOST_PENDING')",[p.id]);
  assert(!active&&old.status!=='ON_LOAN','Cuốn đang trên phiếu mượn; xử lý qua phiếu trả/mất.');
  assert(!(old.status==='LOST'&&p.status==='READY'),'Sách mất cần nhập cuốn thay thế với mã mới.');
  const result=await one(c,'update library.book_copies set status=$2,version=version+1,updated_at=now() where id=$1 returning *',[p.id,p.status]);
  await audit(c,actor,'STATUS','book_copies',p.id,old,result,text(p.reason,'Lý do đổi trạng thái',2000,true)); return result;
}
export async function publicBooks(c) {
  return rows(c,`select t.code,t.title,t.authors,coalesce(g.name,'') category,t.cover_url,t.short_description,t.description,t.publisher,t.language,
    count(c.id) filter(where c.status not in ('LOST','RETIRED'))::integer total,
    count(c.id) filter(where c.status='READY')::integer available
    from library.book_titles t left join library.book_categories g on g.id=t.category_id left join library.book_copies c on c.title_id=t.id
    where t.show_on_web and t.archived_at is null group by t.id,g.name order by t.code`);
}
export async function state(c) {
  const result={};
  const names=['book_titles','book_copies','readers','loans','loan_items','wallets','financial_transactions','cash_entries','deposit_entries','charges','charge_allocations','collection_contacts','print_documents','content_links','reminder_events','book_categories'];
  for(const n of names) result[n]=await rows(c,`select * from library.${n} order by ${n==='content_links'?'sort_order':n==='book_categories'?'name':'id'}`);
  result.audit_logs=await rows(c,'select * from library.audit_logs order by occurred_at desc limit 500');
  result.policy=await policy(c); result.settings=(await one(c,"select value from library.system_settings where key='library'")).value;
  result.today=today(); return result;
}
export async function saveSettings(c,actor,p) {
  const old=(await one(c,"select value from library.system_settings where key='library' for update")).value;
  const value={libraryName:text(p.libraryName,'Tên thư viện',300,true),address:text(p.address||'','Địa chỉ',1000),hotline:text(p.hotline||'','Hotline',50),zaloOaId:url(p.zaloOaId||''),termsOnPrint:text(p.termsOnPrint||old.termsOnPrint,'Điều khoản',5000)};
  await c.query("update library.system_settings set value=$1 where key='library'",[JSON.stringify(value)]);
  const prev=await policy(c);
  const vals=[p.lamourLoanMonths,p.guestLoanMonths,p.guestDepositAmount,p.lateFeePerDay,p.techFeeLostBook,p.outOfPrintMultiplier,1000,10000,p.lossLateFeeRule||null,p.unknownPricePriorityRule||null];
  vals.slice(0,8).forEach(v=>money(v)); assert(vals[0]>0&&vals[1]>0&&vals[5]>0,'Thời hạn/hệ số phải lớn hơn 0.');
  const pol=await one(c,`insert into library.policy_versions(version,company_term_months,walkin_term_months,walkin_deposit_vnd,late_fee_vnd_per_day,replacement_technical_fee_vnd,out_of_print_multiplier,vietnamese_page_rate,foreign_page_rate,loss_late_fee_rule,unknown_price_priority_rule,created_by)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,[prev.version+1,...vals,actor]);
  await audit(c,actor,'POLICY_VERSION','system_settings','library',{settings:old,policy:prev},{settings:value,policy:pol}); return value;
}
export async function transfer(c,actor,p,key) {
  money(p.amount); assert(p.amount>0&&p.from!==p.to,'Chọn hai ví khác nhau và số tiền > 0.');
  // Ordered wallet locks avoid deadlocks on transfers in opposing directions.
  await rows(c,'select id from library.wallets where id=any($1::uuid[]) order by id for update',[[p.from,p.to]]);
  const tx=await financial(c,actor,'TRANSFER',null,p.amount,key,text(p.reason,'Lý do',2000,true));
  await cash(c,tx.id,p.from,'OUT',p.amount); await cash(c,tx.id,p.to,'IN',p.amount);
  await audit(c,actor,'TRANSFER','financial_transactions',tx.id,null,tx,p.reason); return tx;
}
export async function reminders(c,actor) {
  const open=await rows(c,"select id,due_on from library.loan_items where resolution_status='OPEN'");
  for(const i of open) {
    const days=Math.round((Date.parse(i.due_on)-Date.parse(today()))/86400000);
    const milestones=[];
    if(today()>=addMonths(i.due_on,-1)) milestones.push('ONE_MONTH');
    for(const n of [14,7,3]) if(days<=n) milestones.push('DAY_'+n);
    if(days<0) milestones.push('OVERDUE');
    for(const m of milestones) await c.query('insert into library.reminder_events(loan_item_id,milestone,due_date_snapshot) values($1,$2,$3) on conflict do nothing',[i.id,m,i.due_on]);
  }
  return rows(c,`select e.*,c.code copy_code,t.title,r.full_name,r.phone_display,l.code loan_code,l.id loan_id from library.reminder_events e join library.loan_items i on i.id=e.loan_item_id join library.loans l on l.id=i.loan_id join library.readers r on r.id=l.reader_id join library.book_copies c on c.id=i.copy_id join library.book_titles t on t.id=c.title_id where i.resolution_status='OPEN' order by i.due_on`);
}
export async function settlementQuote(c,p) {
  const {item:i}=await itemWithPolicy(c,p.itemId);
  assert(i.resolution_status!=='OPEN','Nhận sách trước khi quyết toán.');
  const charges=await rows(c,`select ch.*,ch.amount_vnd-coalesce((select sum(case when a.direction='APPLY' then a.amount_vnd else -a.amount_vnd end) from library.charge_allocations a where a.charge_id=ch.id),0) remaining from library.charges ch where ch.loan_item_id=$1 and ch.reverses_charge_id is null order by ch.created_at,ch.id`,[i.id]);
  const remaining=charges.reduce((n,ch)=>n+Number(ch.remaining),0),held=i.deposit_held,applied=Math.min(held,remaining);
  return {itemId:i.id,version:i.version,charges,remaining,held,applied,refund:held-applied,extra:remaining-applied};
}
export async function settlePending(c,actor,p,key) {
  const {item:i}=await itemWithPolicy(c,p.itemId,true);const q=await settlementQuote(c,p);
  assert(p.version===i.version&&p.quoteHash===hash(q),'Đối soát đã thay đổi; tải lại báo giá.',409);
  const reason=text(p.reason,'Lý do quyết toán',2000,true);
  if(q.extra||q.refund){await checkWallet(c,p.walletId);assert(p.cashConfirmed===true,'Xác nhận thực thu/chi.');}
  const l={id:i.loan_id,reader_id:i.reader_id};let left=q.applied;
  const appliedTx=q.applied?await financial(c,actor,'APPLY_DEPOSIT',l,q.applied,key+':apply',reason):null;
  if(appliedTx)await deposit(c,appliedTx.id,i.id,'DECREASE','APPLY',q.applied);
  const extraTx=q.extra?await financial(c,actor,'COLLECT_CHARGE',l,q.extra,key+':extra',reason):null;
  if(extraTx)await cash(c,extraTx.id,p.walletId,'IN',q.extra);
  for(const ch of q.charges){const applied=Math.min(left,Number(ch.remaining)),extra=Number(ch.remaining)-applied;left-=applied;
    for(const [t,amount] of [[appliedTx,applied],[extraTx,extra]])if(amount)await c.query("insert into library.charge_allocations(transaction_id,charge_id,direction,amount_vnd) values($1,$2,'APPLY',$3)",[t.id,ch.id,amount]);
  }
  if(q.refund){const tx=await financial(c,actor,'REFUND_DEPOSIT',l,q.refund,key+':refund',reason);await cash(c,tx.id,p.walletId,'OUT',q.refund);await deposit(c,tx.id,i.id,'DECREASE','REFUND',q.refund);}
  const newState=i.resolution_status==='LOST_PENDING'?'LOST_PENDING':'RESOLVED';
  await c.query('update library.loan_items set resolution_status=$2,version=version+1,updated_at=now() where id=$1',[i.id,newState]);
  await updateLoanStatus(c,i.loan_id);await audit(c,actor,'SETTLE','loan_items',i.id,i,q,reason);await printSnapshot(c,actor,i.loan_id,'STATEMENT');return q;
}
export async function reverseTransfer(c,actor,p,key){
  const old=await one(c,'select * from library.financial_transactions where id=$1 for update',[p.id]);assert(old,'Không tìm thấy giao dịch.',404);
  assert(old.type==='TRANSFER'&&!old.reversal_of_id,'Chức năng đảo trực tiếp áp dụng chuyển ví. Đối soát phiếu cần điều chỉnh theo từng nghĩa vụ.');
  assert(!await one(c,'select id from library.financial_transactions where reversal_of_id=$1',[old.id]),'Giao dịch đã đảo.',409);
  const entries=await rows(c,'select * from library.cash_entries where transaction_id=$1',[old.id]);
  await rows(c,'select id from library.wallets where id=any($1::uuid[]) order by id for update',[entries.map(e=>e.wallet_id)]);
  const reason=text(p.reason,'Lý do đảo',2000,true),tx=await financial(c,actor,'REVERSE_TRANSFER',null,Number(old.amount_vnd),key,reason,old.id);
  for(const e of entries)await cash(c,tx.id,e.wallet_id,e.direction==='IN'?'OUT':'IN',Number(e.amount_vnd));
  await audit(c,actor,'REVERSE_TRANSFER','financial_transactions',old.id,old,tx,reason);return tx;
}

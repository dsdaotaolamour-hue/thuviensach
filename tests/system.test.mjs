import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import ExcelJS from 'exceljs';
import {addMonths,phone,settlement} from '../server/domain.mjs';
import * as svc from '../server/service.mjs';
import {validateImport,commitImport,exportBooks,inspectWorkbook} from '../server/excel.mjs';
const actor='00000000-0000-0000-0000-000000000001';
async function fixture(){
  const db=new PGlite({parsers:{1082:v=>v,20:v=>Number(v)}});await db.waitReady;
  for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
  await db.query('insert into library.admin_accounts(id) values($1)',[actor]);
  return db;
}
async function tx(db,fn){await db.query('begin');try{const result=await fn();await db.query('commit');return result;}catch(e){await db.query('rollback');throw e;}}
async function seed(db,options={}){
  const book=await svc.createBook(db,actor,{title:'Sách thử nghiệm',author:'Tác giả',category:'Da liễu',copiesCount:2,price:100000,pages:100,languageGroup:'VIETNAMESE',publishStatus:'OUT_OF_PRINT',showOnWeb:true,...options});
  const reader=await svc.createReader(db,actor,{name:'Độc giả thử',phone:'0912345678',category:'WALK_IN'});
  const copies=await svc.rows(db,'select id from library.book_copies where title_id=$1 order by code',[book.id]);
  const wallet=await svc.one(db,"select * from library.wallets where code='V01'");
  const p={readerId:reader.id,copyIds:copies.map(c=>c.id),borrowDate:'2025-01-31',conditionNote:'Tốt nguyên vẹn',walletId:wallet.id,depositConfirmed:true};
  p.quoteToken=svc.loanQuoteToken(await svc.loanQuote(db,p));return {book,reader,copies,wallet,p};
}
test('calendar terms clamp end of month, leap years and timezone-independent dates',()=>{
  assert.equal(addMonths('2026-01-31',3),'2026-04-30');assert.equal(addMonths('2024-02-29',12),'2025-02-28');assert.equal(addMonths('2026-03-31',-1),'2026-02-28');
  assert.equal(phone('+84 912 345 678'),'0912345678');assert.throws(()=>phone('abc'));
});
test('migrations, Excel columns, single admin and append-only history',async()=>{
  const db=await fixture();try{
    await assert.rejects(db.query('insert into library.admin_accounts(id) values($1)',[randomUUID()]));
    const report=await inspectWorkbook(await readFile('tests/fixtures/Book1_hoanchinh.xlsx'));
    assert.equal(report.sheets.length,13);assert.equal(report.sheets.find(s=>s.name==='ĐẦU SÁCH').headers[12],'GIÁ BÌA (đ)');
    await assert.rejects(db.query('update library.policy_versions set late_fee_vnd_per_day=0'));
    const tables=await svc.rows(db,"select tablename,rowsecurity from pg_tables where schemaname='library'");assert.ok(tables.length>=28&&tables.every(t=>t.rowsecurity));
  }finally{await db.close();}
});
test('multi-copy issuance is atomic, idempotent and prevents duplicate checkout',async()=>{
  const db=await fixture();try{
    const {p}=await seed(db),key=randomUUID();
    const issue=()=>tx(db,()=>svc.idempotent(db,actor,'issue',key,p,()=>svc.issueLoan(db,actor,p,key)));
    const l=await issue();assert.equal(l.due_on,'2025-04-30');assert.equal((await issue()).id,l.id);
    assert.equal((await svc.one(db,'select count(*) n from library.loans')).n,1);
    await assert.rejects(tx(db,()=>svc.issueLoan(db,actor,p,randomUUID())),/không còn sẵn sàng/);
    await assert.rejects(tx(db,()=>svc.idempotent(db,actor,'issue',key,{...p,borrowDate:'2025-02-01'},()=>{})),/nội dung khác/);
    assert.equal(Number((await svc.one(db,'select sum(amount_vnd) n from library.cash_entries')).n),1000000);
    assert.equal((await svc.rows(db,'select * from library.loan_items')).length,2);
  }finally{await db.close();}
});
test('partial return: fee 15000, refund 485000; other copy retains deposit; no duplicate cash income',async()=>{
  const db=await fixture();try{
    const {p,wallet}=await seed(db);const l=await tx(db,()=>svc.issueLoan(db,actor,p,randomUUID()));
    const i=await svc.one(db,'select * from library.loan_items where loan_id=$1 order by id',[l.id]);
    const input={itemId:i.id,actualDate:'2025-05-03',outcome:'GOOD',conditionIn:'Trả tốt',reason:'Đã kiểm tra và hoàn tiền',walletId:wallet.id,cashConfirmed:true};
    const q=await svc.returnQuote(db,input),{version,itemId,...calc}=q;
    assert.equal(q.late,15000);assert.equal(q.refund,485000);
    await tx(db,()=>svc.returnBook(db,actor,{...input,version,quoteHash:svc.hash(calc)},randomUUID()));
    const bal=await svc.one(db,"select sum(case when direction='IN' then amount_vnd else -amount_vnd end) n from library.cash_entries");assert.equal(Number(bal.n),515000);
    const held=await svc.one(db,"select sum(case when direction='INCREASE' then amount_vnd else -amount_vnd end) n from library.deposit_entries");assert.equal(Number(held.n),500000);
    assert.equal((await svc.one(db,'select status from library.loans where id=$1',[l.id])).status,'PARTIAL');
    await assert.rejects(tx(db,()=>svc.returnBook(db,actor,{...input,version,quoteHash:svc.hash(calc)},randomUUID())),/đã được trả/);
    const doc=await svc.one(db,"select * from library.print_documents where type='BORROW'");assert.equal(doc.snapshot.items[0].returned_on,null);
    await assert.rejects(db.query('delete from library.cash_entries'));
  }finally{await db.close();}
});
test('policy snapshots do not change old loans and missing compensation evidence is rejected',async()=>{
  const db=await fixture();try{
    const {p}=await seed(db);const l=await tx(db,()=>svc.issueLoan(db,actor,p,randomUUID()));
    await svc.saveSettings(db,actor,{libraryName:'Thư viện',address:'',hotline:'',zaloOaId:'',lamourLoanMonths:12,guestLoanMonths:3,guestDepositAmount:600000,lateFeePerDay:10000,techFeeLostBook:20000,outOfPrintMultiplier:3,lossLateFeeRule:'CONFIRMATION_DATE',unknownPricePriorityRule:'REPLACE_FIRST'});
    const i=await svc.one(db,'select * from library.loan_items where loan_id=$1',[l.id]);
    const q=await svc.returnQuote(db,{itemId:i.id,actualDate:'2025-05-01',outcome:'GOOD'});assert.equal(q.late,5000);
    await assert.rejects(svc.returnQuote(db,{itemId:i.id,actualDate:'2025-05-01',outcome:'LOST'}),/Chưa cấu hình/);
    const {item,policy}=await svc.itemWithPolicy(db,i.id);
    assert.throws(()=>settlement({...item,title_snapshot:{publication_status:'UNKNOWN'}},{...policy,loss_late_fee_rule:'CONFIRMATION_DATE'},{actualDate:'2025-05-01',outcome:'LOST'}),/Thiếu căn cứ/);
    assert.throws(()=>settlement(item,policy,{actualDate:'2025-05-01',outcome:'MINOR_DAMAGE',damageAmount:10000}),/Người quyết định/);
  }finally{await db.close();}
});
test('Excel export round trip validates versions; original blank placeholder is rejected',async()=>{
  const db=await fixture();try{
    await seed(db);const bytes=await exportBooks(db);const v=await tx(db,()=>validateImport(db,actor,bytes,'UPDATE'));assert.equal(v.job.status,'VALIDATED');assert.equal(v.rows.length,3);
    await tx(db,()=>commitImport(db,actor,v.job.id));
    const stale=await tx(db,()=>validateImport(db,actor,bytes,'UPDATE'));assert.equal(stale.job.status,'INVALID');
    const original=await validateImport(db,actor,await readFile('tests/fixtures/Book1_hoanchinh.xlsx'),'CREATE');assert.equal(original.job.status,'INVALID');
    const fresh=await exportBooks(db,true),wb=new ExcelJS.Workbook();await wb.xlsx.load(fresh);
    wb.getWorksheet('ĐẦU SÁCH').addRow([1,'DS100','Sách nhập Excel','Tác giả','Da liễu','','Tiếng Việt','','','','','0012345678901',123000,'Có',0,0,0,0,100,'IN_PRINT','VIETNAMESE']);
    wb.getWorksheet('SÁCH').addRow([1,'DS100-001','Tốt','Sách','Có sẵn','A1','','','DS100','Sách nhập Excel']);
    const valid=await validateImport(db,actor,Buffer.from(await wb.xlsx.writeBuffer()),'CREATE');assert.equal(valid.job.status,'VALIDATED');
    await tx(db,()=>commitImport(db,actor,valid.job.id));assert.equal((await svc.one(db,"select isbn from library.book_titles where code='DS100'")).isbn,'0012345678901');
    const next=await svc.createBook(db,actor,{title:'Tiếp theo',copiesCount:0});assert.equal(next.code,'DS101');
  }finally{await db.close();}
});
test('public DTO never exposes reader, copy, payment or auth data',async()=>{
  const db=await fixture();try{await seed(db);const items=await svc.publicBooks(db);assert.equal(items.length,1);assert.equal(items[0].available,2);assert.deepEqual(Object.keys(items[0]).sort(),['code','title','authors','category','cover_url','short_description','description','publisher','language','total','available'].sort());}finally{await db.close();}
});
test('receive now, settle later updates physical stock and preserves debt/deposit until settled',async()=>{
  const db=await fixture();try{
    const {p,wallet}=await seed(db);await tx(db,()=>svc.issueLoan(db,actor,p,randomUUID()));
    const i=await svc.one(db,'select * from library.loan_items order by id');
    const input={itemId:i.id,actualDate:'2025-05-03',outcome:'GOOD',conditionIn:'Tốt',reason:'Nhận sách, hẹn hoàn tiền sau',settleNow:false};
    const q=await svc.returnQuote(db,input),{version,itemId,...calc}=q;
    await tx(db,()=>svc.returnBook(db,actor,{...input,version,quoteHash:svc.hash(calc)},randomUUID()));
    assert.equal((await svc.one(db,'select status from library.book_copies where id=$1',[i.copy_id])).status,'READY');
    assert.equal((await svc.one(db,'select resolution_status from library.loan_items where id=$1',[i.id])).resolution_status,'RETURNED');
    const pending=await svc.settlementQuote(db,{itemId:i.id});assert.equal(pending.remaining,15000);assert.equal(pending.held,500000);
    await tx(db,()=>svc.settlePending(db,actor,{itemId:i.id,version:pending.version,quoteHash:svc.hash(pending),walletId:wallet.id,cashConfirmed:true,reason:'Đã hoàn tiền và khấu trừ phí'},randomUUID()));
    assert.equal((await svc.one(db,'select resolution_status from library.loan_items where id=$1',[i.id])).resolution_status,'RESOLVED');
    const excel=await svc.one(db,'select * from library.excel_phieu_muon');assert.equal(Number(excel['CỌC CÒN GIỮ (đ)']),500000);
  }finally{await db.close();}
});
test('wallet transfer reversal appends balanced entries and cannot be repeated',async()=>{
  const db=await fixture();try{
    const {p,wallet}=await seed(db);await tx(db,()=>svc.issueLoan(db,actor,p,randomUUID()));
    const to=await svc.one(db,"select * from library.wallets where code='V02'");
    const tx1=await tx(db,()=>svc.transfer(db,actor,{from:wallet.id,to:to.id,amount:100000,reason:'Chuyển quỹ'},randomUUID()));
    await tx(db,()=>svc.reverseTransfer(db,actor,{id:tx1.id,reason:'Chọn nhầm ví'},randomUUID()));
    await assert.rejects(tx(db,()=>svc.reverseTransfer(db,actor,{id:tx1.id,reason:'Lặp'},randomUUID())),/đã đảo/);
    const total=await svc.one(db,"select sum(case when direction='IN' then amount_vnd else -amount_vnd end) n from library.cash_entries");assert.equal(Number(total.n),1000000);
  }finally{await db.close();}
});
test('API rejects unauthenticated access, wrong origin and signed-in non-admin',async()=>{
  const db=await fixture();const oldFetch=global.fetch;try{
    const {handle}=await import('../server/api.mjs');process.env.APP_ORIGIN='http://localhost:3000';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test';
    let r=await handle(new Request('http://localhost:3000/api/v1/admin/state'),['admin','state'],db);assert.equal(r.status,401);
    r=await handle(new Request('http://localhost:3000/api/v1/admin/readers',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),['admin','readers'],db);assert.equal(r.status,403);
    await db.query("insert into library.admin_sessions(account_id,token_hash,idle_expires_at,absolute_expires_at) values($1,$2,now()+interval '30 minutes',now()+interval '12 hours')",[actor,svc.hash('testsession')]);
    global.fetch=async()=>Response.json({id:randomUUID(),email:'other@example.test'});
    r=await handle(new Request('http://localhost:3000/api/v1/admin/state',{headers:{cookie:'lamour_access=test; lamour_session=testsession'}}),['admin','state'],db);assert.equal(r.status,403);
    global.fetch=async()=>Response.json({id:actor,email:'admin@example.test'});
    r=await handle(new Request('http://localhost:3000/api/v1/auth/session',{headers:{cookie:'lamour_access=test; lamour_session=testsession'}}),['auth','session'],db);assert.equal(r.status,200);assert.equal((await r.json()).data.email,'admin@example.test');
  }finally{global.fetch=oldFetch;await db.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import vm from 'node:vm';
test('supplied UI initializes, protects admin route, uses real public DTO and retains all required form bindings',async()=>{
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(await readFile('index.html','utf8'),{url:'http://localhost:3000/#/admin',runScripts:'outside-only',virtualConsole:console});
 const w=dom.window;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;w.prompt=()=>'';w.CSS={escape:v=>v};
 w.fetch=async url=>{
  const data=String(url).endsWith('public/books')?[{code:'DS001',title:'<img src=x onerror=alert(1)>',authors:'A',category:'Da liễu',cover_url:'',short_description:'Mô tả',total:2,available:1}]:String(url).endsWith('public/content')?{settings:{libraryName:'Thư viện',zaloOaId:''},links:[],sections:[]}:null;
  return {ok:!!data,status:data?200:401,json:async()=>data?{data}:{error:{message:'Vui lòng đăng nhập.'}}};
 };
 vm.runInContext(await readFile('assets/js/app.js','utf8'),dom.getInternalVMContext());vm.runInContext(await readFile('assets/js/live.js','utf8'),dom.getInternalVMContext());vm.runInContext(await readFile('assets/js/admin-studio.js','utf8'),dom.getInternalVMContext());
 await w.liveInitialize();
 assert.ok(w.document.getElementById('page-login').classList.contains('active'));
 assert.equal(w.liveSession,null);
 assert.ok(w.document.getElementById('publicBookGrid').textContent.includes('<img src=x onerror=alert(1)>'),w.document.getElementById('publicBookGrid').textContent+' / '+w.document.getElementById('toastContainer').textContent);
 assert.equal(w.document.querySelector('#publicBookGrid img'),null);
 w.location.hash = '#/kho-sach';
 w.routeHash();
 assert.ok(w.document.getElementById('page-catalog').classList.contains('active'));
 assert.equal(w.document.querySelector('#publicBookGrid a').getAttribute('href'), '#/kho-sach/DS001');
 w.location.hash = '#/kho-sach/DS001';
 w.routeHash();
 assert.ok(w.document.getElementById('page-book').classList.contains('active'));
 assert.match(w.document.getElementById('publicBookDetail').textContent, /Mô tả/);
 assert.ok(w.document.getElementById('detailBorrowBtn'));
 assert.equal(w.document.querySelector('#publicBookDetail img'),null);
 assert.equal(w.document.getElementById('loanCopySelect').multiple,true);
 for(const id of ['loanWarnings','loanWarningAck','loanDepositConfirmed','returnWallet','returnDecisionBy','returnSettleNow','nbPublisher','nbYear','nbIsbn','nbPages','nbLanguage','nbLanguageGroup','nbPublishStatus','nbCoverUrl','nbShowOnWeb','importForm','importPreview','cfgLossRule','cfgUnknownPrice','pendingFinance'])assert.ok(w.document.getElementById(id),'Missing '+id);
 assert.equal(w.document.getElementById('loginPassword').value,'');
 assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));dom.window.close();
});
test('authenticated empty system renders every admin tab without sample records or runtime errors',async()=>{
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(await readFile('index.html','utf8'),{url:'http://localhost:3000/#/admin',runScripts:'outside-only',virtualConsole:console});
 const w=dom.window;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.CSS={escape:v=>v};
 const state={today:'2026-11-05',settings:{libraryName:'Thư viện',address:'',hotline:'',zaloOaId:'',termsOnPrint:''},policy:{company_term_months:12,walkin_term_months:3,walkin_deposit_vnd:500000,late_fee_vnd_per_day:5000,replacement_technical_fee_vnd:20000,out_of_print_multiplier:3}};
 for(const n of ['book_titles','book_copies','readers','loans','loan_items','wallets','financial_transactions','cash_entries','deposit_entries','charges','charge_allocations','collection_contacts','print_documents','content_links','reminder_events','book_categories','audit_logs'])state[n]=[];
 w.fetch=async (url, options)=>({ok:true,status:200,json:async()=>({data:String(url).endsWith('admin/notifications')?{
   preferences:{backup:true,books:true,due:true,backupDay:1,booksDay:5,dueDays:7},
   items:[{id:'backup:sample',kind:'backup',title:'Sao lưu thư viện',detail:'Tải bản sao lưu.',date:'2026-11-02',read:Boolean(JSON.parse(options.body).readId)}]
 }:String(url).endsWith('public/books')?[]:String(url).endsWith('public/content')?{settings:state.settings,links:[],sections:[]}:String(url).endsWith('auth/session')?{email:'admin@example.test'}:state})});
 vm.runInContext(await readFile('assets/js/app.js','utf8'),dom.getInternalVMContext());vm.runInContext(await readFile('assets/js/live.js','utf8'),dom.getInternalVMContext());vm.runInContext(await readFile('assets/js/admin-studio.js','utf8'),dom.getInternalVMContext());await w.liveInitialize();
 assert.ok(w.document.getElementById('page-admin').classList.contains('active'));
 for(const tab of ['dashboard','books','loans','readers','wallets','print','settings'])w.switchAdminTab(tab);
 assert.equal(w.document.getElementById('operationError').hidden,true,w.document.getElementById('operationError').textContent);
 assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));assert.ok(!w.document.getElementById('adminReadersTableBody').textContent.includes('Nguyễn Thị Thanh Hương'));
 const loan = {id:'loan-1',code:'PM001',borrowed_on:'2026-11-01',due_on:'2026-12-01',reader_snapshot:{full_name:'Nguyễn An',phone_display:'090 123 4567'}};
 state.print_documents.push({id:'document-1',code:'PM001-BORROW-1234',loan_id:loan.id,type:'BORROW',snapshot:{loan,settings:state.settings,items:[],transactions:[]}});
 w.switchAdminTab('print');
 const search = w.document.getElementById('studioPrintSearch');
 const printButton = w.document.getElementById('studioPrintButton');
 for (const query of ['PM001', 'nguyen an', '0901234567']) {
   search.value = query;
   w.renderStudioPrintChoices();
   w.renderPrintPreview();
   assert.equal(printButton.disabled, false);
   assert.match(w.document.getElementById('a4PrintSheet').textContent, /Nguyễn An/);
 }
 search.value = 'PM999';
 w.renderStudioPrintChoices();
 w.renderPrintPreview();
 assert.equal(printButton.disabled, true);
 assert.match(w.document.getElementById('studioPrintCount').textContent, /Không tìm thấy/);
 assert.doesNotMatch(w.document.getElementById('a4PrintSheet').textContent, /Nguyễn An/);
 await w.refreshStudioInbox();
 assert.ok(w.document.getElementById('studioBell').classList.contains('has-unread'));
 w.studioNotifications();
 assert.ok(w.document.getElementById('studioBell').classList.contains('has-unread'));
 await w.openStudioNotification(0);
 assert.match(w.document.getElementById('studioNotificationModalBody').textContent, /Tải bản sao lưu/);
 assert.ok(!w.document.getElementById('studioBell').classList.contains('has-unread'));
 w.studioHelp();
 assert.ok(w.document.querySelector('#studioHelpModal details summary'));
 state.book_titles.push(...Array.from({length:22},(_,i)=>({
   id:'book-'+i,code:'DS'+String(i+1).padStart(3,'0'),title:'Sách '+(i+1),authors:'Tác giả',show_on_web:false
 })));
 w.switchAdminTab('books');
 const bookRows = w.document.getElementById('adminBooksTableBody');
 assert.equal(bookRows.rows.length,10);
 w.changeStudioBookPage(2);
 assert.match(bookRows.rows[0].textContent,/DS011/);
 assert.match(w.document.getElementById('studioBookDetail').textContent,/Sách 11/);
 w.document.getElementById('studioBookPageSize').value='20';
 w.changeStudioBookPage(1);
 assert.equal(bookRows.rows.length,20);
 w.changeStudioBookPage(2);
 assert.equal(bookRows.rows.length,2);
 state.loans.push({...loan,status:'PARTIAL',reader_snapshot:{...loan.reader_snapshot,code:'DG001'}});
 state.book_copies.push({id:'copy-1',code:'DS001-001'},{id:'copy-2',code:'DS002-001'});
 state.loan_items.push(
   {id:'item-1',loan_id:loan.id,copy_id:'copy-1',title_snapshot:{title:'Sách đã thu'},due_on:loan.due_on,returned_on:'2026-11-06',resolution_status:'RESOLVED'},
   {id:'item-2',loan_id:loan.id,copy_id:'copy-2',title_snapshot:{title:'Sách chưa thu'},due_on:loan.due_on,resolution_status:'OPEN'}
 );
 w.renderAdminLoans();
 const loanRows=w.document.getElementById('adminLoansTableBody');
 assert.equal(loanRows.rows.length,1);
 assert.match(loanRows.rows[0].textContent,/1 \/ 2[\s\S]*Trả một phần/);
 w.toggleStudioLoan(loan.id);
 const detail=loanRows.querySelector('.studio-loan-detail');
 assert.match(detail.textContent,/Sách đã thu[\s\S]*2026-11-06/);
 assert.match(detail.textContent,/Sách chưa thu[\s\S]*Trả \/ Báo mất/);
 dom.window.close();
});

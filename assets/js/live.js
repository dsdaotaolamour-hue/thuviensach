/* Supabase-backed integration. Business calculations and writes go through the server API. */
let liveState=null,livePublic=[],liveContent={links:[],sections:[]},returnQuoteValue=null,quoteSequence=0;
window.liveSession=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function decodeHtml(value){const el=document.createElement('textarea');el.innerHTML=value;return el.value;}
const val=id=>document.getElementById(id)?.value||'';
const num=id=>val(id)===''?null:Number(val(id));
const checked=id=>!!document.getElementById(id)?.checked;
const copyLabels={READY:'Có sẵn',ON_LOAN:'Đang mượn',REPAIR:'Đang sửa',DAMAGED:'Hư nặng',LOST:'Mất',RETIRED:'Thanh lý'};
const readerLabels={COMPANY:'Khách hàng Công ty/Lamour',INTERNAL:'Nhân sự nội bộ',WALK_IN:'Khách vãng lai'};
const typeLabels={COLLECT_DEPOSIT:'Thu cọc',APPLY_DEPOSIT:'Trừ cọc',REFUND_DEPOSIT:'Hoàn cọc',COLLECT_CHARGE:'Phạt trễ',TRANSFER:'Chuyển ví'};
function loadDatabase(){return structuredClone(DEFAULT_DB);}
function saveDatabase(){throw new Error('Dữ liệu chỉ được lưu qua API máy chủ.');}
function addSystemLog(){/* Audit is recorded by server transactions. */}
async function api(path,body,method=body?'POST':'GET',key) {
  const headers={}; if(body && !(body instanceof FormData)) headers['Content-Type']='application/json';
  if(method!=='GET') headers['Idempotency-Key']=key||crypto.randomUUID();
  const options={method,headers,credentials:'same-origin',...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})};
  let response;
  try {response=await fetch('/api/v1/'+path,options);} catch {response=await fetch('/api/v1/'+path,options);}
  const result=await response.json();
  if(!response.ok) {if(response.status===401&&window.liveSession){window.liveSession=null;clearPrivate();navigateTo('login');}throw new Error(result.error?.message||'Yêu cầu thất bại.');}
  return result.data;
}
async function action(fn,form) {
  if(form?.dataset.busy)return;
  if(form){form.dataset.busy='1';form.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true);}
  try {return await fn();} catch(e) {showToast(e.message);const box=document.getElementById('operationError');if(box){box.hidden=false;box.textContent=e.message;}return null;}
  finally {if(form){delete form.dataset.busy;form.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=false);}}
}
function clearPrivate(){liveState=null;db=structuredClone(DEFAULT_DB);applyPublic();document.querySelectorAll('#page-admin tbody').forEach(x=>x.replaceChildren());}
async function refreshState(){liveState=await api('admin/state');applyState();renderAllAdminViews();renderExtra();}
function applyPublic(){
  db.bookTitles=livePublic.map(t=>({id:t.code,code:t.code,title:esc(t.title),author:esc(t.authors),publisher:esc(t.publisher),language:esc(t.language),category:esc(t.category),description:esc(t.description),short_desc:esc(t.short_description),coverUrl:esc(t.cover_url),showOnWeb:true,publicCounts:{total:t.total,available:t.available,borrowed:0,repairing:0}}));
  syncPublicCategories();renderPublicBooks();
}
const originalCounts=getBookCounts;
getBookCounts=function(code){const b=db.bookTitles.find(x=>x.id===code);return b?.publicCounts||originalCounts(code);};
function applyState(){
  const s=liveState,p=s.policy;
  db.settings={...s.settings,lamourLoanMonths:p.company_term_months,guestLoanMonths:p.walkin_term_months,guestDepositAmount:Number(p.walkin_deposit_vnd),lateFeePerDay:Number(p.late_fee_vnd_per_day),techFeeLostBook:Number(p.replacement_technical_fee_vnd),outOfPrintMultiplier:p.out_of_print_multiplier};
  db.bookTitles=s.book_titles.map(t=>({id:t.code,uuid:t.id,version:t.version,code:t.code,title:esc(t.title),author:esc(t.authors),category:esc(s.book_categories.find(g=>g.id===t.category_id)?.name||''),publisher:esc(t.publisher),language:esc(t.language),price:t.cover_price_vnd,pages:t.page_count,publishStatus:t.publication_status,coverUrl:esc(t.cover_url),showOnWeb:t.show_on_web,description:esc(t.description),short_desc:esc(t.short_description)}));
  db.bookCopies=s.book_copies.map(c=>({copyId:c.code,bookId:s.book_titles.find(t=>t.id===c.title_id)?.code,condition:esc(c.physical_condition),status:copyLabels[c.status],shelf:esc(c.shelf_location),note:esc(c.condition_note)}));
  db.readers=s.readers.map(r=>({id:r.code,name:esc(r.full_name),phone:esc(r.phone_display),type:readerLabels[r.reader_category],status:esc(r.account_status),address:esc(r.address),note:esc(r.notes)}));
  db.wallets=s.wallets.map(w=>({id:w.code,name:esc(w.display_name),type:({MOMO:'Ví điện tử',BANK:'Ngân hàng',CASH:'Tiền mặt',OTHER:'Khác'})[w.type],account:esc([w.account_number,w.account_holder,w.bank_name].filter(Boolean).join(' – ')),initialBalance:Number(w.opening_balance_vnd),status:w.active?'Đang dùng':'Ngưng'}));
  db.loans=s.loan_items.map(i=>{
    const l=s.loans.find(l=>l.id===i.loan_id),cp=s.book_copies.find(c=>c.id===i.copy_id),r=s.readers.find(r=>r.id===l.reader_id);
    const held=s.deposit_entries.filter(e=>e.loan_item_id===i.id).reduce((n,e)=>n+(e.direction==='INCREASE'?1:-1)*Number(e.amount_vnd),0);
    return {id:i.id,loanCode:l.code,readerId:r.code,copyId:cp.code,bookId:i.title_snapshot.code,borrowDate:l.borrowed_on,dueDate:i.due_on,remindDate:addMonthsToDateStr(i.due_on,-1),returnDate:i.returned_on||'',depositRequired:Number(i.deposit_required_vnd),depositHeld:held,wallet:esc(s.wallets.find(w=>w.id===i.deposit_wallet_id)?.display_name||'Không thu cọc'),conditionBefore:esc(i.condition_out_note),status:i.resolution_status==='RESOLVED'?'Đã trả – Đã xử lý':i.resolution_status==='RETURNED'?'Chờ quyết toán':i.resolution_status==='LOST_PENDING'?'Chờ sách thay thế':i.due_on<s.today?'Quá hạn':'Đang mượn'};
  });
  db.activities=s.financial_transactions.map(t=>{
    const ce=s.cash_entries.filter(e=>e.transaction_id===t.id),de=s.deposit_entries.filter(e=>e.transaction_id===t.id),r=s.readers.find(r=>r.id===t.reader_id),l=s.loans.find(l=>l.id===t.loan_id);
    return {id:t.code,time:new Date(t.occurred_at).toLocaleString('vi-VN'),readerId:r?.code||'',loanId:l?.code||'',type:typeLabels[t.type]||esc(t.type),amount:Number(t.amount_vnd),wallet:esc(ce.map(e=>s.wallets.find(w=>w.id===e.wallet_id)?.display_name).join(' → ')||s.wallets.find(w=>w.id===s.loan_items.find(i=>i.id===de[0]?.loan_item_id)?.deposit_wallet_id)?.display_name||''),depositEffect:formatCurrency(de.reduce((n,e)=>n+(e.direction==='INCREASE'?1:-1)*Number(e.amount_vnd),0)),walletEffect:formatCurrency(ce.reduce((n,e)=>n+(e.direction==='IN'?1:-1)*Number(e.amount_vnd),0)),staff:'Admin',note:esc(t.reason)};
  });
  db.logs=s.audit_logs.map(l=>({time:esc(new Date(l.occurred_at).toLocaleString('vi-VN')),actor:'Admin',action:esc(l.action),target:esc(l.target_table+' '+(l.target_id||'')),detail:esc(l.reason)}));
  syncPublicCategories();
}
function syncPublicCategories(){const el=document.getElementById('publicCategoryFilter'),old=el.value;el.innerHTML='<option value="ALL">Tất cả chuyên mục</option>'+[...new Set(db.bookTitles.filter(t=>t.showOnWeb).map(t=>t.category))].map(c=>`<option value="${c}">${c}</option>`).join('');el.value=[...el.options].some(o=>o.value===old)?old:'ALL';}
function getWalletStats(name){
  if(!liveState)return {balance:0,depositHeld:0};
  const w=liveState.wallets.find(w=>esc(w.display_name)===name);if(!w)return {balance:0,depositHeld:0};
  const balance=Number(w.opening_balance_vnd)+liveState.cash_entries.filter(e=>e.wallet_id===w.id).reduce((n,e)=>n+(e.direction==='IN'?1:-1)*Number(e.amount_vnd),0);
  const depositHeld=liveState.loan_items.filter(i=>i.deposit_wallet_id===w.id).reduce((n,i)=>n+liveState.deposit_entries.filter(e=>e.loan_item_id===i.id).reduce((m,e)=>m+(e.direction==='INCREASE'?1:-1)*Number(e.amount_vnd),0),0);
  return {balance,depositHeld};
}
async function handleInstantLogin(e){e.preventDefault();await action(async()=>{document.getElementById('loginError').textContent='';try{window.liveSession=await api('auth/login',{email:val('loginUsername'),password:val('loginPassword')});document.getElementById('loginPassword').value='';await refreshState();setText('activeAdminName',window.liveSession.email);navigateTo('admin');}catch(err){document.getElementById('loginError').textContent=err.message;throw err;}},e.target);}
async function handleLogout(){await action(async()=>{await api('auth/logout',{});window.liveSession=null;clearPrivate();navigateTo('home');showToast('Đã đăng xuất.');});}
async function toggleBookWebVisibility(code,visible){await action(async()=>{const b=liveState.book_titles.find(x=>x.code===code);await api('admin/book-titles/visibility',{id:b.id,version:b.version,visible});await refreshState();});}
async function addQuickCopy(code){await action(async()=>{const t=liveState.book_titles.find(t=>t.code===code);await api('admin/copies',{titleId:t.id,shelf:prompt('Vị trí kệ:','')||''});await refreshState();});}
function openNewCopyModal(){const code=prompt('Nhập mã đầu sách cần thêm cuốn (VD: DS001):');if(code)addQuickCopy(code.trim());}
async function changeCopyStatus(code,label){await action(async()=>{const cp=liveState.book_copies.find(c=>c.code===code);const reason=prompt('Lý do đổi trạng thái:');if(!reason){await refreshState();return;}await api('admin/copies/status',{id:cp.id,version:cp.version,status:Object.keys(copyLabels).find(k=>copyLabels[k]===label),reason});await refreshState();});}
async function submitNewBook(e){e.preventDefault();await action(async()=>{await api('admin/book-titles',{title:val('nbTitle'),author:val('nbAuthor'),category:val('nbCategory'),price:num('nbPrice'),copiesCount:num('nbInitialCopies'),shelf:val('nbShelf'),description:val('nbDesc'),publisher:val('nbPublisher'),year:num('nbYear'),isbn:val('nbIsbn'),pages:num('nbPages'),language:val('nbLanguage'),languageGroup:val('nbLanguageGroup'),publishStatus:val('nbPublishStatus'),coverUrl:val('nbCoverUrl'),showOnWeb:checked('nbShowOnWeb')});closeModal('newBookModal');e.target.reset();await refreshState();showToast('Đã lưu đầu sách và các cuốn.');},e.target);}
async function submitNewReader(e){e.preventDefault();await action(async()=>{await api('admin/readers',{name:val('nrName'),phone:val('nrPhone'),category:({'Khách hàng Công ty/Lamour':'COMPANY','Nhân sự nội bộ':'INTERNAL','Khách vãng lai':'WALK_IN'})[val('nrType')],address:val('nrAddress'),note:val('nrNote')});closeModal('newReaderModal');e.target.reset();await refreshState();},e.target);}
function addMonthsToDateStr(value,months){const [y,m,d]=value.split('-').map(Number),a=new Date(Date.UTC(y,m-1+Number(months),1));const last=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+1,0)).getUTCDate();a.setUTCDate(Math.min(d,last));return a.toISOString().slice(0,10);}
function walletOptions(){return liveState.wallets.filter(w=>w.active).map(w=>`<option value="${w.id}">${esc(w.display_name)}</option>`).join('');}
function openNewLoanModal(){
  if(!liveState)return;
  document.getElementById('newLoanForm').reset();
  document.getElementById('loanReaderSelect').innerHTML=liveState.readers.filter(r=>!r.archived_at).map(r=>`<option value="${r.id}">${esc(r.phone_display+' — '+r.full_name+' ('+readerLabels[r.reader_category]+')')}</option>`).join('');
  document.getElementById('loanCopySelect').innerHTML=liveState.book_copies.filter(c=>c.status==='READY'&&liveState.book_titles.some(t=>t.id===c.title_id&&!t.archived_at)).map(c=>`<option value="${c.id}">${esc(c.code+' — '+liveState.book_titles.find(t=>t.id===c.title_id)?.title)}</option>`).join('');
  document.getElementById('loanWalletSelect').innerHTML=walletOptions();document.getElementById('loanStartDate').value=liveState.today;onLoanReaderChange();openModal('newLoanModal');
}
function loanPayload(){return {readerId:val('loanReaderSelect'),copyIds:[...document.getElementById('loanCopySelect').selectedOptions].map(o=>o.value),borrowDate:val('loanStartDate'),walletId:val('loanWalletSelect'),conditionNote:val('loanConditionNote'),warningAcknowledged:checked('loanWarningAck'),depositConfirmed:checked('loanDepositConfirmed')};}
async function onLoanReaderChange(){const p=loanPayload();if(!p.copyIds.length){setText('loanWarnings','Chọn một hoặc nhiều cuốn (Ctrl/Cmd để chọn nhiều).');return;}await action(async()=>{const q=await api('admin/loans/quote',p);document.getElementById('loanDueDate').value=q.dueDate;document.getElementById('loanDepositInput').value=q.deposit;setText('loanWarnings',q.overdue?`Cảnh báo: độc giả có ${q.overdue} cuốn quá hạn. Xác nhận đã đọc để tiếp tục.`:'Đã tra cứu nhóm khách và chính sách hiện hành.');});}
async function submitNewLoan(e){e.preventDefault();await action(async()=>{const p=loanPayload();const q=await api('admin/loans/quote',p);p.quoteToken=q.quoteToken;if(!confirm(`Phát hành ${p.copyIds.length} cuốn, hạn ${q.dueDate}, cọc ${formatCurrency(q.deposit)}?`))return;await api('admin/loans/issue',p);closeModal('newLoanModal');await refreshState();showToast('Đã phát hành phiếu.');},e.target);}
function renderAdminLoans(){
  if(!liveState)return;
  const q=normalizeSearch(val('adminLoanSearch')),filter=val('adminLoanFilter')||'ALL',type=val('adminLoanReaderTypeFilter')||'ALL',time=val('adminLoanTimeFilter')||'ALL';
  const filtered=db.loans.filter(l=>{
    const r=db.readers.find(r=>r.id===l.readerId);const hay=normalizeSearch([l.loanCode,l.copyId,r?.name,r?.phone].join(' '));
    const days=(Date.parse(l.dueDate)-Date.parse(liveState.today))/86400000;
    return (!q||hay.includes(q))&&(filter==='ALL'||l.status===filter)&&(type==='ALL'||r?.type===type)&&(time==='ALL'||(time==='OVERDUE'&&l.status==='Quá hạn')||(time==='DUE_30'&&days>=0&&days<=30&&l.status!=='Đã trả – Đã xử lý')||(time==='THIS_MONTH'&&l.borrowDate.slice(0,7)===liveState.today.slice(0,7)));
  });
  setText('loanCountAll',liveState.loans.length);setText('loanCountActive',liveState.loans.filter(l=>l.status!=='COMPLETED').length);setText('loanCountOverdue',new Set(db.loans.filter(l=>l.status==='Quá hạn').map(l=>l.loanCode)).size);setText('loanCountDone',liveState.loans.filter(l=>l.status==='COMPLETED').length);setText('adminLoanResultCount',`${filtered.length} cuốn trên phiếu`);
  document.getElementById('adminLoansTableBody').innerHTML=filtered.length?filtered.map(l=>{const r=db.readers.find(r=>r.id===l.readerId);return `<tr><td><b>${l.loanCode}</b></td><td>${r?.name}<br/>${r?.phone}</td><td>${r?.type}</td><td>${l.copyId}</td><td>${l.borrowDate}</td><td>${l.dueDate}</td><td>${l.remindDate}</td><td>${formatCurrency(l.depositHeld)}</td><td>${l.wallet}</td><td>${l.status}</td><td>${l.status==='Đã trả – Đã xử lý'?`<button class="btn btn-xs" onclick="previewLoanInPrintTab('${l.id}')">In</button>`:l.status==='Chờ sách thay thế'?`<button class="btn btn-xs" onclick="receiveReplacement('${l.id}')">Nhận sách thay thế</button>`:`<button class="btn btn-primary btn-xs" onclick="openReturnModal('${l.id}')">Trả / Mất cuốn này</button>`}<button class="btn btn-xs" onclick="recordContact('${l.id}')">Liên hệ</button></td></tr>`;}).join(''):emptyTableRow(11,'Chưa có phiếu phù hợp','Lập phiếu mới hoặc đổi bộ lọc.');
}
function returnPayload(){return {itemId:val('returnLoanId'),actualDate:val('returnActualDate'),outcome:({'Trả tốt':'GOOD','Hư nhẹ':'MINOR_DAMAGE','Hư nặng':'MAJOR_DAMAGE','Mất':'LOST'})[val('returnConditionSelect')],damageAmount:num('returnCustomDamageFee')||0,decisionBy:val('returnDecisionBy'),reason:val('returnAuditNote'),conditionIn:val('returnConditionSelect'),walletId:val('returnWallet'),replacementReceived:checked('returnReplacementReceived'),cashConfirmed:checked('returnCashConfirmed'),settleNow:checked('returnSettleNow')};}
function openReturnModal(itemId){
  const i=liveState.loan_items.find(x=>x.id===itemId),l=liveState.loans.find(l=>l.id===i.loan_id);
  if(i.resolution_status==='RETURNED'){switchAdminTab('wallets');showToast('Sách đã nhận. Quyết toán ở mục Cuốn đã nhận / nghĩa vụ còn chờ.');return;}
  document.getElementById('returnLoanForm').reset();document.getElementById('returnLoanId').value=itemId;setText('returnModalTitle',`Xử lý ${l.code} / ${liveState.book_copies.find(c=>c.id===i.copy_id).code}`);
  document.getElementById('returnLoanSummaryBox').textContent=`${l.reader_snapshot.full_name} — ${i.title_snapshot.title}. Tình trạng giao: ${i.condition_out} / ${i.condition_out_note}. Hạn: ${i.due_on}`;
  document.getElementById('returnWallet').innerHTML=walletOptions();document.getElementById('returnWallet').value=i.deposit_wallet_id||liveState.wallets[0]?.id;
  document.getElementById('returnActualDate').value=liveState.today;document.getElementById('returnBookPages').value=i.title_snapshot.page_count||'';
  document.getElementById('returnAuditNote').value='';document.getElementById('returnSettlementPreview').textContent='Nhập ghi chú kiểm tra và người quyết định khi hư hỏng để lấy báo giá.';
  returnQuoteValue=null;openModal('returnLoanModal');recalculateReturnSettlement();
}
async function recalculateReturnSettlement(){
  const seq=++quoteSequence;returnQuoteValue=null;const p=returnPayload();
  document.getElementById('lostPagesRow').style.display=p.outcome==='GOOD'?'none':'grid';
  try {const q=await api('admin/returns/quote',p);if(seq!==quoteSequence)return;returnQuoteValue=q;setText('returnSettlementPreview',`Trễ ${q.days} ngày: ${formatCurrency(q.late)}. Bồi thường/phí kỹ thuật: ${formatCurrency(q.damage)}. Khấu trừ cọc: ${formatCurrency(q.applied)}. Hoàn: ${formatCurrency(q.refund)}. Thu thêm: ${formatCurrency(q.extra)}.${q.replacement?' Phải nhận sách thay thế; phiếu còn chờ nếu chưa nhận.':''}`);}catch(e){if(seq===quoteSequence)setText('returnSettlementPreview',e.message);}
}
async function submitReturnLoan(e){e.preventDefault();await action(async()=>{await recalculateReturnSettlement();if(!returnQuoteValue)throw new Error('Chưa có báo giá hợp lệ.');const p={...returnPayload(),version:returnQuoteValue.version,quoteHash:returnQuoteValue.quoteHash};if(!confirm('Xác nhận đã kiểm tra cuốn sách và thực hiện các khoản thu/hoàn theo báo giá?'))return;await api('admin/returns',p);closeModal('returnLoanModal');await refreshState();showToast('Đã xử lý cuốn sách và ghi sổ đối soát.');},e.target);}
async function receiveReplacement(id){await action(async()=>{const reason=prompt('Ghi nhận kiểm tra sách mới cùng tên/tác giả, tình trạng và ngày nhận:');if(!reason)return;await api('admin/replacements',{itemId:id,reason});await refreshState();});}
async function recordContact(id){await action(async()=>{const i=liveState.loan_items.find(x=>x.id===id),content=prompt('Nội dung liên hệ/nhắc hạn:');if(!content)return;const result=prompt('Kết quả liên hệ:');if(!result)return;await api('admin/contacts',{loanId:i.loan_id,channel:'Điện thoại / Zalo thủ công',content,result});await refreshState();});}
async function saveSettingsForm(){await action(async()=>{await api('admin/settings',{libraryName:val('cfgLibraryName'),address:val('cfgAddress'),hotline:val('cfgHotline'),zaloOaId:val('cfgZaloOa'),lamourLoanMonths:num('cfgLamourMonths'),guestLoanMonths:num('cfgGuestMonths'),guestDepositAmount:num('cfgDepositAmount'),lateFeePerDay:num('cfgLateFeePerDay'),techFeeLostBook:num('cfgTechFee'),outOfPrintMultiplier:num('cfgOutPrintMultiplier'),lossLateFeeRule:val('cfgLossRule'),unknownPricePriorityRule:val('cfgUnknownPrice')});await refreshState();showToast('Đã lưu phiên bản chính sách mới. Phiếu cũ giữ chính sách lúc phát hành.');});}
function renderPrintPreviewSelect(){if(!liveState)return;const sel=document.getElementById('printLoanSelect'),old=sel.value;sel.innerHTML=liveState.print_documents.map(d=>`<option value="${d.id}">${esc(d.code)} (${esc(d.type)})</option>`).join('');if(liveState.print_documents.some(d=>d.id===old))sel.value=old;document.getElementById('printTypeSelect').hidden=true;}
function previewLoanInPrintTab(itemId){switchAdminTab('print');const i=liveState.loan_items.find(i=>i.id===itemId),d=liveState.print_documents.filter(d=>d.loan_id===i.loan_id).at(-1);if(d)document.getElementById('printLoanSelect').value=d.id;renderPrintPreview();}
function renderPrintPreview(){
  const target=document.getElementById('a4PrintSheet');if(!liveState){target.textContent='';return;}
  const d=liveState.print_documents.find(d=>d.id===val('printLoanSelect'));if(!d){target.textContent='Chưa có phiếu được phát hành.';return;}
  const s=d.snapshot,l=s.loan;const labels={BORROW:'PHIẾU MƯỢN SÁCH',RETURN:'PHIẾU TRẢ & ĐỐI SOÁT',REPLACEMENT:'BIÊN NHẬN SÁCH THAY THẾ',STATEMENT:'BIÊN NHẬN QUYẾT TOÁN'};
  target.innerHTML=`<h2>${esc(s.settings.libraryName)}</h2><p>${esc(s.settings.address)} — ${esc(s.settings.hotline)}</p><h2>${labels[d.type]||esc(d.type)}</h2><p>Mã tài liệu: ${esc(d.code)}<br/>Phiếu: ${esc(l.code)} — ${esc(l.reader_snapshot.full_name)} — ${esc(l.reader_snapshot.phone_display)}<br/>Ngày mượn ${l.borrowed_on}; hạn ${l.due_on}</p><table class="data-table"><thead><tr><th>Mã cuốn</th><th>Tên sách</th><th>Tình trạng giao / nhận</th><th>Ngày trả</th><th>Cọc đã thu</th></tr></thead><tbody>${s.items.map(i=>`<tr><td>${esc(i.copy_code)}</td><td>${esc(i.title_snapshot.title)}</td><td>${esc(i.condition_out_note)} / ${esc(i.condition_in||'Chưa nhận')}</td><td>${i.returned_on||i.loss_confirmed_on||''}</td><td>${formatCurrency(Number(i.deposit_required_vnd))}</td></tr>`).join('')}</tbody></table><h3>Các khoản đã ghi nhận đến lúc lập tài liệu</h3>${s.transactions.map(t=>`<p>${esc(t.code)} — ${esc(typeLabels[t.type]||t.type)}: ${formatCurrency(Number(t.amount_vnd))}</p>`).join('')}<p>${esc(s.settings.termsOnPrint)}</p><div class="print-signatures"><div>NGƯỜI MƯỢN<br/>(Ký, ghi rõ họ tên)</div><div>NGƯỜI XỬ LÝ<br/>(Ký, ghi rõ họ tên)</div></div>`;
}
async function download(path,body,name){
  const r=await fetch('/api/v1/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok){const x=await r.json();throw new Error(x.error?.message||'Không tải được file.');}
  const a=document.createElement('a'),u=URL.createObjectURL(await r.blob());a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function initQrBoxes(){for(const id of ['isovQrBox','lamourMasterQr','footerZaloQr','modalZaloQr']){const box=document.getElementById(id);if(box)box.textContent='Chưa cấu hình mã QR';}}
async function publicRefresh(){livePublic=await api('public/books');liveContent=await api('public/content');if(!liveState){db.settings={...DEFAULT_DB.settings,...liveContent.settings};applyPublic();}applyContent();}
function applyContent(){
  for(const link of liveContent.links){document.querySelectorAll(`[data-content-link="${CSS.escape(link.key)}"]`).forEach(el=>{el.href=link.url;});}
  const qr={footerZaloQr:liveContent.settings?.zaloOaId,modalZaloQr:liveContent.settings?.zaloOaId,isovQrBox:liveContent.links.find(x=>x.key==='isov-zalo')?.url,lamourMasterQr:liveContent.links.find(x=>x.key==='drive-master')?.url};
  for(const [id,url] of Object.entries(qr)){const el=document.getElementById(id);if(el&&url){const img=document.createElement('img');img.src='/api/qr?url='+encodeURIComponent(url);img.alt='Mã QR liên hệ';img.style.width='100%';el.replaceChildren(img);}}
  for(const section of liveContent.sections){const page=document.getElementById('page-'+section.page_key);if(section.section_key==='hero'&&page){const title=page.querySelector('h1'),description=title?.parentElement.querySelector('p');if(title)title.textContent=section.structured_content.title;if(description)description.textContent=section.structured_content.description;}}
}
async function liveInitialize(){
  installExtra();initQrBoxes();switchIsovTier('standard');switchGalleryYear('2026');
  // Placeholder links cannot navigate to fake external destinations.
  document.querySelectorAll('a[href*="drive.google.com"]').forEach((a,i)=>{a.dataset.contentLink=['drive-master','drive-treatment','drive-products','drive-training','drive-business','drive-2024','drive-2025','drive-2026'][i]||'drive-master';a.removeAttribute('href');a.addEventListener('click',e=>{if(!a.href){e.preventDefault();showToast('Liên kết đang được cập nhật.');}});});
  renderPublicBooks();
  try {await publicRefresh();}catch(e){setText('publicBookGrid','Chưa kết nối dữ liệu. Quản trị viên cần hoàn tất cấu hình Supabase.');showToast(e.message);}
  try {window.liveSession=await api('auth/session');setText('activeAdminName',window.liveSession.email);await refreshState();}catch {window.liveSession=null;}
  routeHash();window.addEventListener('hashchange',routeHash);
  document.getElementById('returnAuditNote')?.addEventListener('input',()=>{clearTimeout(window.quoteTimer);window.quoteTimer=setTimeout(recalculateReturnSettlement,400);});
  document.getElementById('returnDecisionBy')?.addEventListener('input',()=>{clearTimeout(window.quoteTimer);window.quoteTimer=setTimeout(recalculateReturnSettlement,400);});
}
function routeHash() {
  const hash = location.hash;
  const detailPrefix = '#/kho-sach/';
  if (hash.startsWith(detailPrefix)) {
    let code = '';
    try { code = decodeURIComponent(hash.slice(detailPrefix.length)); } catch { /* Invalid URL. */ }
    renderBookDetail(code);
    navigateTo('book');
    return;
  }
  if (hash === '#/kho-sach' || hash === '#inventory') {
    navigateTo('catalog');
    return;
  }
  const routes = {'#/login':'login', '#/isov-standard':'isov', '#/lamour-data':'data'};
  const page = hash.startsWith('#/admin') ? 'admin' : routes[hash] || 'home';
  navigateTo(page);
  if (page === 'admin' && window.liveSession) {
    const tab = hash.split('/')[2] || 'dashboard';
    switchAdminTab(['dashboard','books','loans','readers','wallets','print','settings'].includes(tab) ? tab : 'dashboard', false);
  }
}
function installExtra(){
  const alert=document.createElement('div');alert.id='operationError';alert.hidden=true;alert.setAttribute('role','alert');alert.className='operation-error';document.querySelector('.admin-content')?.prepend(alert);
  document.getElementById('returnWallet').insertAdjacentHTML('afterend','<label><input type="checkbox" id="returnSettleNow" checked /> Quyết toán ngay (bỏ chọn để nhận sách và quyết toán sau)</label>');
  document.getElementById('settingsForm').insertAdjacentHTML('beforeend',`<div class="form-row"><label>Mất sách: ngày chốt phí trễ (áp dụng phiếu mới)</label><select id="cfgLossRule"><option value="">Chưa quyết định — chặn xử lý mất</option><option value="CONFIRMATION_DATE">Ngày xác nhận mất</option><option value="RESOLUTION_DATE">Ngày xử lý xong (phải nhận sách thay thế khi chốt)</option></select><label>Sách còn phát hành nhưng không có giá gốc</label><select id="cfgUnknownPrice"><option value="">Chưa quyết định — chặn trường hợp này</option><option value="REPLACE_FIRST">Ưu tiên thay sách</option><option value="PAGE_RATE_FIRST">Ưu tiên đơn giá/trang</option></select></div>`);
  document.getElementById('admin-tab-books').insertAdjacentHTML('beforeend',`<div class="panel-card mt-16"><h3>Nhập / Xuất Excel sách</h3><p>Giữ cột gốc ĐẦU SÁCH và SÁCH của Book1_hoanchinh.xlsx. Các cột tính toán chỉ đọc. Không nhập phiếu hoặc tiền bằng Excel.</p><button class="btn btn-outline" onclick="action(()=>download('admin/book-export?template=1',null,'mau-nhap-sach.xlsx'))">Tải mẫu</button> <button class="btn btn-outline" onclick="action(()=>download('admin/book-export',null,'sach-lamour.xlsx'))">Xuất sách hiện tại</button><form id="importForm" onsubmit="previewImport(event)"><label>File Excel<input type="file" id="importFile" accept=".xlsx" required /></label><label>Chế độ<select id="importMode"><option value="CREATE">Thêm mới theo mã</option><option value="UPDATE">Cập nhật thông tin (cần VERSION)</option></select></label><button type="submit" class="btn btn-primary">Kiểm tra &amp; xem trước</button></form><div id="importPreview"></div></div>`);
  document.getElementById('admin-tab-dashboard').insertAdjacentHTML('beforeend',`<div class="panel-card mt-16"><h3>Nhắc hạn &amp; liên hệ thu hồi</h3><button class="btn btn-outline" onclick="loadReminders()">Cập nhật danh sách</button><div id="reminderList">Bấm cập nhật để xem các mốc nhắc hạn. Không tự gửi tin Zalo.</div><div id="contactHistory"></div></div>`);
  document.getElementById('admin-tab-wallets').insertAdjacentHTML('beforeend',`<div class="panel-card mt-16"><h3>Chuyển tiền giữa ví</h3><form id="transferForm" onsubmit="submitTransfer(event)"><label>Từ ví<select id="transferFrom"></select></label><label>Đến ví<select id="transferTo"></select></label><label>Số tiền<input id="transferAmount" type="number" min="1" required /></label><label>Lý do<input id="transferReason" required /></label><button type="submit" class="btn btn-primary">Ghi nhận đã chuyển</button></form><details><summary>Thêm ví thanh toán</summary><form onsubmit="submitWallet(event)"><label>Mã ví<input name="code" required /></label><label>Tên hiển thị<input name="name" required /></label><label>Loại<select name="type"><option value="BANK">Ngân hàng</option><option value="MOMO">Momo</option><option value="CASH">Tiền mặt</option><option value="OTHER">Khác</option></select></label><label>Chủ tài khoản<input name="holder" /></label><label>Số tài khoản / SĐT<input name="account" /></label><label>Ngân hàng<input name="bank" /></label><label>URL QR<input name="qrUrl" type="url" /></label><label>Số dư đầu kỳ<input name="openingBalance" type="number" min="0" value="0" /></label><button type="submit" class="btn btn-primary">Thêm ví</button></form></details></div>`);
  document.getElementById('admin-tab-wallets').insertAdjacentHTML('beforeend','<div class="panel-card mt-16"><h3>Cuốn đã nhận / nghĩa vụ còn chờ</h3><div id="pendingFinance"></div><h3>Đảo chuyển ví</h3><div id="reversibleTransfers"></div></div>');
  document.getElementById('admin-tab-settings').insertAdjacentHTML('beforeend',`<div class="panel-card mt-16"><h3>Nội dung website &amp; đường dẫn thật</h3><form onsubmit="submitContent(event)"><label>Trang<select name="page"><option value="home">Thư viện</option><option value="isov">ISOV</option><option value="data">Kho dữ liệu</option></select></label><label>Tiêu đề<input name="title" required /></label><label>Mô tả<textarea name="description" required></textarea></label><button type="submit" class="btn btn-primary">Lưu nội dung</button></form><form onsubmit="submitContentLink(event)"><label>Vị trí link<select name="key"><option value="drive-master">Drive tổng</option><option value="drive-treatment">Liệu trình</option><option value="drive-products">Sản phẩm</option><option value="drive-training">Khóa đào tạo</option><option value="drive-business">Mô hình 100 triệu</option><option value="drive-2024">Ảnh ISOV 2024</option><option value="drive-2025">Ảnh ISOV 2025</option><option value="drive-2026">Ảnh ISOV 2026</option><option value="isov-zalo">Zalo ISOV</option></select></label><label>Nhãn<input name="label" required /></label><label>URL<input name="url" type="url" required /></label><label>URL ảnh QR riêng (tùy chọn)<input name="qrUrl" type="url" /></label><button type="submit" class="btn btn-primary">Lưu link</button></form><div id="configuredLinks"></div></div>
  <div class="panel-card mt-16"><h3>Backup &amp; bảo vệ tài khoản</h3><p>Backup tự động: chưa cấu hình nơi lưu riêng. Tải JSON thủ công và cất trong nơi lưu trữ riêng có mã hóa. Khôi phục vào database trống bằng scripts/restore.mjs, xem hướng dẫn.</p><form onsubmit="exportBackup(event)"><label>Mật khẩu xác nhận<input name="password" type="password" autocomplete="current-password" required /></label><button type="submit" class="btn btn-primary">Tải backup toàn bộ</button></form><form onsubmit="changePassword(event)"><label>Mật khẩu hiện tại<input name="currentPassword" type="password" autocomplete="current-password" required /></label><label>Mật khẩu mới (ít nhất 12 ký tự)<input name="password" type="password" autocomplete="new-password" minlength="12" required /></label><button type="submit" class="btn btn-outline">Đổi mật khẩu</button></form></div>`);
}
function renderExtra(){if(!liveState)return;document.getElementById('cfgLossRule').value=liveState.policy.loss_late_fee_rule||'';document.getElementById('cfgUnknownPrice').value=liveState.policy.unknown_price_priority_rule||'';
  for(const id of ['transferFrom','transferTo'])document.getElementById(id).innerHTML=walletOptions();
  setText('contactHistory',liveState.collection_contacts.map(c=>`${liveState.loans.find(l=>l.id===c.loan_id)?.code}: ${c.content} — ${c.result}`).join('\n'));
  setText('configuredLinks',liveState.content_links.map(l=>`${l.label}: ${l.url}`).join('\n'));
  document.getElementById('pendingFinance').innerHTML=liveState.loan_items.filter(i=>['RETURNED','LOST_PENDING'].includes(i.resolution_status)).map(i=>`<p>${esc(liveState.loans.find(l=>l.id===i.loan_id)?.code)} / ${esc(liveState.book_copies.find(c=>c.id===i.copy_id)?.code)} <button class="btn btn-xs" onclick="settlePendingUi('${i.id}')">Quyết toán tiền</button>${i.resolution_status==='LOST_PENDING'?` <button class="btn btn-xs" onclick="receiveReplacement('${i.id}')">Nhận sách thay thế</button>`:''}</p>`).join('')||'Không có cuốn chờ xử lý.';
  document.getElementById('reversibleTransfers').innerHTML=liveState.financial_transactions.filter(t=>t.type==='TRANSFER'&&!liveState.financial_transactions.some(x=>x.reversal_of_id===t.id)).map(t=>`<p>${esc(t.code)}: ${formatCurrency(Number(t.amount_vnd))} <button class="btn btn-xs" onclick="reverseTransferUi('${t.id}')">Đảo bằng bút toán mới</button></p>`).join('')||'Không có giao dịch chuyển ví cần đảo.';
}
let importJob=null;
async function previewImport(e){e.preventDefault();await action(async()=>{const form=new FormData();form.set('file',document.getElementById('importFile').files[0]);form.set('mode',val('importMode'));const result=await api('admin/book-imports/validate',form);importJob=result.job;document.getElementById('importPreview').innerHTML=`<p>Trạng thái: ${esc(result.job.status)}. ${result.rows.length} dòng.</p><div class="table-responsive"><table class="data-table"><thead><tr><th>Sheet / dòng</th><th>Mã</th><th>Thao tác</th><th>Thông tin trước → sau / Lỗi</th></tr></thead><tbody>${result.rows.map(r=>`<tr><td>${esc(r.sheet)} / ${r.row}</td><td>${esc(r.data.code)}</td><td>${esc(r.action)}</td><td>${r.errors.length?esc(r.errors.join('; ')):esc((r.data.before?JSON.stringify(r.data.before)+' → ':'')+JSON.stringify(r.data))}</td></tr>`).join('')}</tbody></table></div>${result.job.status==='VALIDATED'?'<button class="btn btn-primary" onclick="confirmImport()">Xác nhận nhập các dòng đã xem</button>':''}`;},e.target);}
async function confirmImport(){await action(async()=>{if(!confirm('Ghi các thay đổi đã xem trước vào kho sách?'))return;const r=await api('admin/book-imports/commit',{jobId:importJob.id});setText('importPreview',`Đã nhập ${r.imported} dòng.`);await refreshState();});}
async function submitTransfer(e){e.preventDefault();await action(async()=>{await api('admin/transfers',{from:val('transferFrom'),to:val('transferTo'),amount:num('transferAmount'),reason:val('transferReason')});e.target.reset();await refreshState();},e.target);}
async function submitWallet(e){e.preventDefault();await action(async()=>{const p=Object.fromEntries(new FormData(e.target));p.openingBalance=Number(p.openingBalance);await api('admin/wallets',p);e.target.reset();await refreshState();},e.target);}
async function submitContent(e){e.preventDefault();await action(async()=>{await api('admin/content',Object.fromEntries(new FormData(e.target)));await publicRefresh();showToast('Đã lưu nội dung.');},e.target);}
async function submitContentLink(e){e.preventDefault();await action(async()=>{await api('admin/content-links',Object.fromEntries(new FormData(e.target)));await refreshState();await publicRefresh();},e.target);}
async function exportBackup(e){e.preventDefault();await action(async()=>{await download('admin/backups/export',{password:new FormData(e.target).get('password')},'lamour-backup.json');e.target.reset();},e.target);}
async function changePassword(e){e.preventDefault();await action(async()=>{await api('admin/account',Object.fromEntries(new FormData(e.target)),'PATCH');e.target.reset();window.liveSession=null;clearPrivate();navigateTo('login');showToast('Đã đổi mật khẩu và thu hồi các phiên. Vui lòng đăng nhập lại.');},e.target);}
async function loadReminders(){await action(async()=>{const list=await api('admin/reminders');document.getElementById('reminderList').innerHTML=list.length?list.map(r=>`<p><b>${esc(r.loan_code)} / ${esc(r.copy_code)}</b> — ${esc(r.full_name)} (${esc(r.phone_display)}) — hạn ${r.due_date_snapshot} — ${esc(r.milestone)} — ${esc(r.status)} <button class="btn btn-xs" onclick="acknowledgeReminder('${r.id}')">Đã xem</button></p>`).join(''):'Chưa có sách đến mốc nhắc hạn.';});}
async function acknowledgeReminder(id){await action(async()=>{await api('admin/reminders/acknowledge',{id});await loadReminders();});}
function renderAdminDashboard(){
  if(!liveState)return;
  const copies=liveState.book_copies,items=liveState.loan_items,loans=liveState.loans;
  const held=liveState.deposit_entries.reduce((n,e)=>n+(e.direction==='INCREASE'?1:-1)*Number(e.amount_vnd),0);
  const paid=liveState.charge_allocations.reduce((n,e)=>n+(e.direction==='APPLY'?1:-1)*Number(e.amount_vnd),0);
  const overdue=new Set(items.filter(i=>i.resolution_status==='OPEN'&&i.due_on<liveState.today).map(i=>i.loan_id));
  const metrics=[['Đầu sách / Tổng cuốn',`${liveState.book_titles.length} / ${copies.filter(c=>!['LOST','RETIRED'].includes(c.status)).length}`],['Sẵn sàng / Đang mượn',`${copies.filter(c=>c.status==='READY').length} / ${copies.filter(c=>c.status==='ON_LOAN').length}`],['Độc giả',liveState.readers.length],['Phiếu đang mở / Quá hạn',`${loans.filter(l=>l.status!=='COMPLETED').length} / ${overdue.size}`],['Cọc đang giữ',formatCurrency(held)],['Nghĩa vụ đã thanh toán',formatCurrency(paid)]];
  document.getElementById('adminKpiGrid').innerHTML=metrics.map(([label,value])=>`<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div></div>`).join('');
  document.getElementById('dashboardWalletBody').innerHTML=db.wallets.map(w=>{const st=getWalletStats(w.name);return `<tr><td>${w.id}</td><td>${w.name}</td><td>${formatCurrency(st.balance)}</td><td>${formatCurrency(st.depositHeld)}</td><td>${w.status}</td></tr>`;}).join('');
  document.getElementById('dashboardAlertsList').innerHTML=items.filter(i=>i.resolution_status==='OPEN'&&addMonthsToDateStr(i.due_on,-1)<=liveState.today).map(i=>{const l=loans.find(l=>l.id===i.loan_id),cp=copies.find(c=>c.id===i.copy_id);return `<div class="alert-item"><div><strong>${esc(l.code)} / ${esc(cp.code)} — ${i.due_on<liveState.today?'QUÁ HẠN':'ĐẾN KỲ NHẮC'}</strong><p>${esc(l.reader_snapshot.full_name)} — ${esc(l.reader_snapshot.phone_display)}. Hạn ${i.due_on}</p></div><button class="btn btn-xs" onclick="openReturnModal('${i.id}')">Xử lý cuốn</button></div>`;}).join('')||'<p>Không có cuốn đến kỳ nhắc hạn hoặc quá hạn.</p>';
}
async function settlePendingUi(id){await action(async()=>{const q=await api('admin/settlements/quote',{itemId:id});const walletCode=prompt(`Khấu trừ ${formatCurrency(q.applied)}, hoàn ${formatCurrency(q.refund)}, thu thêm ${formatCurrency(q.extra)}. Nhập mã ví thực tế: ${liveState.wallets.map(w=>w.code+' = '+w.display_name).join(', ')}`);if(!walletCode)return;const wallet=liveState.wallets.find(w=>w.code===walletCode.trim());if(!wallet)throw new Error('Mã ví không tồn tại.');const reason=prompt('Lý do quyết toán (xác nhận đã thực thu/chi):');if(!reason)return;await api('admin/settlements',{itemId:id,version:q.version,quoteHash:q.quoteHash,walletId:wallet.id,cashConfirmed:true,reason});await refreshState();});}
async function reverseTransferUi(id){await action(async()=>{const reason=prompt('Lý do đảo giao dịch chuyển ví:');if(!reason)return;await api('admin/transactions/reverse',{id,reason});await refreshState();});}
// Real links and aggregate-only analytics. Never transmit the message or phone number.
trackEvent=function(event,payload={}){const target=String(payload.bookId||payload.folder||payload.source||'general').replace(/[^\w-]/g,'').slice(0,100)||'general';api('public/events',{event,target}).catch(()=>{});};
openZaloOA=function(){const link=liveContent.settings?.zaloOaId;if(!link){showToast('Chưa cấu hình Zalo OA.');return;}trackEvent('redirect_zalo_oa');window.open(link,'_blank','noopener,noreferrer');};
openZaloWithTemplate=function(message){if(message)copyTextToClipboard(message);openZaloOA();};
switchGalleryYear=function(year,button){if(button){document.querySelectorAll('.year-btn').forEach(x=>x.classList.remove('active'));button.classList.add('active');}setText('isovYearLabel','Năm '+year);setText('isovGalleryGrid','Hình ảnh đối tác đang được cập nhật.');const a=document.getElementById('isovDriveYearLink'),link=liveContent.links.find(l=>l.key==='drive-'+year);if(a){a.dataset.contentLink='drive-'+year;if(link)a.href=link.url;else a.removeAttribute('href');}};

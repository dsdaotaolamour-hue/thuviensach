export class AppError extends Error {
  constructor(message, status=422, code='VALIDATION_ERROR') { super(message); this.status=status; this.code=code; }
}
export function assert(ok, message, status=422, code='VALIDATION_ERROR') { if (!ok) throw new AppError(message,status,code); }
export function text(value, name, max=2000, required=false) {
  assert(typeof value==='string' && value.length<=max && (!required || value.trim()), `Không hợp lệ: ${name}`);
  return value.trim();
}
export function money(value, name='Số tiền') {
  assert(Number.isSafeInteger(value) && value>=0 && value<=100000000000, `${name} phải là số nguyên không âm.`); return value;
}
export function date(value) {
  assert(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value,'Ngày không hợp lệ.'); return value;
}
export function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function addMonths(value, months) {
  date(value); const [y,m,d]=value.split('-').map(Number);
  const first=new Date(Date.UTC(y,m-1+months,1));
  const end=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  first.setUTCDate(Math.min(d,end)); return first.toISOString().slice(0,10);
}
export function phone(value) {
  let p=text(value,'Số điện thoại',30,true).replace(/[\s().-]/g,'');
  if(p.startsWith('+84')) p='0'+p.slice(3); else if(p.startsWith('84')) p='0'+p.slice(2);
  assert(/^0\d{9,10}$/.test(p),'Số điện thoại Việt Nam cần 10–11 chữ số.'); return p;
}
export function url(value) {
  if(!value) return ''; let u;try{u=new URL(value);}catch{throw new AppError('URL không hợp lệ.');}
  assert(['https:','http:'].includes(u.protocol) && !u.username && !u.password,'URL phải dùng https/http.'); return u.href;
}
export function settlement(item, policy, input) {
  const actual=date(input.actualDate); assert(actual>=item.borrowed_on && actual<=today(),'Ngày trả phải nằm từ ngày mượn đến hôm nay.');
  const days=Math.max(0,Math.round((Date.parse(actual)-Date.parse(item.due_on))/86400000));
  const late=days*Number(policy.late_fee_vnd_per_day); let damage=0, replacement=false;
  assert(['GOOD','MINOR_DAMAGE','MAJOR_DAMAGE','LOST'].includes(input.outcome),'Kết quả trả không hợp lệ.');
  if(['MINOR_DAMAGE','MAJOR_DAMAGE'].includes(input.outcome)) {
    damage=money(input.damageAmount,'Bồi thường');
    text(input.decisionBy,'Người quyết định',200,true); text(input.reason,'Lý do',2000,true);
  }
  if(input.outcome==='LOST') {
    assert(policy.loss_late_fee_rule,'Chưa cấu hình quy tắc ngày ngừng phí trễ khi mất sách.');
    const b=item.title_snapshot;
    assert(b.publication_status!=='UNKNOWN','Thiếu căn cứ: tình trạng phát hành.');
    if(b.cover_price_vnd==null) assert(policy.unknown_price_priority_rule,'Chưa cấu hình ưu tiên xử lý sách không có giá gốc.');
    if(b.publication_status==='IN_PRINT' && (b.cover_price_vnd!=null || policy.unknown_price_priority_rule==='REPLACE_FIRST')) {
      damage=Number(policy.replacement_technical_fee_vnd); replacement=true;
    } else if(b.cover_price_vnd!=null) damage=Number(b.cover_price_vnd)*Number(policy.out_of_print_multiplier);
    else {
      assert(b.page_count>0 && ['VIETNAMESE','FOREIGN'].includes(b.compensation_language_group),'Thiếu căn cứ: số trang hoặc nhóm ngôn ngữ.');
      damage=Number(b.page_count)*Number(b.compensation_language_group==='VIETNAMESE'?policy.vietnamese_page_rate:policy.foreign_page_rate);
    }
  }
  const total=late+damage, held=Number(item.deposit_held||0), applied=Math.min(held,total);
  return {days,late,damage,replacement,total,applied,refund:held-applied,extra:total-applied};
}

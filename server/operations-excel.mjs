import ExcelJS from 'exceljs';
import {assert, date, money, phone, text} from './domain.mjs';
import {checkArchive, value} from './excel.mjs';
import {editReader} from './admin-edit.mjs';
import * as svc from './service.mjs';

const schemas = {
  readers: ['ĐỌC GIẢ', ['MÃ ĐỌC GIẢ','HỌ TÊN','SỐ ĐIỆN THOẠI','NHÓM KHÁCH','EMAIL','ĐỊA CHỈ','CƠ SỞ','GHI CHÚ','VERSION']],
  loans: ['PHIẾU MƯỢN MỚI', ['MÃ THAM CHIẾU','MÃ ĐỌC GIẢ','MÃ CUỐN (CÁCH NHAU BẰNG DẤU PHẨY)','NGÀY MƯỢN','HẠN TRẢ','TÌNH TRẠNG BÀN GIAO','MÃ VÍ NHẬN CỌC','CỌC ĐÃ THU (đ)','XÁC NHẬN QUÁ HẠN']],
  transfers: ['CHUYỂN VÍ', ['MÃ THAM CHIẾU','MÃ VÍ NGUỒN','MÃ VÍ ĐÍCH','SỐ TIỀN (đ)','LÝ DO']]
};

function schema(kind) {
  assert(Object.hasOwn(schemas,kind),'Loại file không hợp lệ.');
  return schemas[kind];
}

export async function operationsTemplate(client, kind, template) {
  const [name, headers] = schema(kind);
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet(name);
  sheet.addRow(headers);
  sheet.getRow(1).font = {bold:true};
  sheet.views = [{state:'frozen',ySplit:1}];
  sheet.columns.forEach(column => { column.width = 23; });
  if (kind === 'readers' && !template) {
    const readers = await svc.rows(client,'select * from library.readers where archived_at is null order by code');
    for (const r of readers) sheet.addRow([r.code,r.full_name,r.phone_display,r.reader_category,r.email,r.address,r.organization,r.notes,r.version]);
  }
  const guide = book.addWorksheet('HƯỚNG DẪN');
  const instructions = {
    readers:'Nhóm khách: COMPANY, INTERNAL hoặc WALK_IN. Độc giả mới để trống mã, nhập điện thoại dạng văn bản. Khi sửa hãy giữ mã và VERSION từ file xuất.',
    loans:'Nhập độc giả và sách trước. Dùng mã tham chiếu duy nhất; ngày dạng YYYY-MM-DD. Hạn trả và số cọc phải khớp chính sách; chỉ nhập tiền đã nhận thật. Gõ Có để xác nhận cảnh báo quá hạn.',
    transfers:'Mỗi dòng là khoản chuyển giữa hai ví đã diễn ra. Mã tham chiếu duy nhất. Không dùng mẫu này để nhập lại số dư, thu cọc hoặc khoản hoàn/phạt.'
  };
  guide.addRow([instructions[kind]]);
  return Buffer.from(await book.xlsx.writeBuffer());
}

async function wallet(client, code) {
  const row = await svc.one(client,'select id from library.wallets where code=$1 and active',[code]);
  assert(row,'Không tìm thấy ví đang hoạt động: '+code);
  return row.id;
}

async function planReader(client, values) {
  const [code,name,number,category,email,address,organization,note,version] = values;
  const normalized = phone(number);
  assert(['COMPANY','INTERNAL','WALK_IN'].includes(category),'Nhóm khách không hợp lệ.');
  const data = {
    name:text(name,'Họ tên',300,true),phone:number,category,email:text(email,'Email',320),
    address:text(address,'Địa chỉ',1000),organization:text(organization,'Cơ sở',300),note:text(note,'Ghi chú',3000)
  };
  const old = await svc.one(client,code
    ? 'select * from library.readers where code=$1'
    : 'select * from library.readers where phone_normalized=$1',[code||normalized]);
  if (code) assert(old && !old.archived_at,'Mã độc giả không tồn tại hoặc đã lưu trữ.');
  if (old) {
    const fields = {name:'full_name',phone:'phone_display',category:'reader_category',email:'email',address:'address',organization:'organization',note:'notes'};
    const changes = Object.keys(fields).filter(key => data[key] !== (old[fields[key]] ?? ''))
      .map(key=>`${key}: ${old[fields[key]] ?? '—'} → ${data[key] || '—'}`);
    if (!changes.length) return {action:'SKIP', summary:'Không đổi'};
    assert(code && Number(version) === old.version,'Độc giả đã tồn tại. Xuất danh sách mới để chỉnh đúng mã và VERSION.');
    return {action:'UPDATE',data:{...data,id:old.id,version:old.version},summary:changes.join(' · ')};
  }
  return {action:'CREATE',data,summary:'Thêm độc giả: '+name};
}

async function planOperation(client, actor, kind, values) {
  const [reference] = values;
  assert(/^[A-Za-z0-9_-]{1,64}$/.test(reference),'Mã tham chiếu cần 1–64 chữ cái, số, gạch ngang hoặc gạch dưới.');
  const key = 'excel:'+svc.hash(reference);
  const source = {values};
  const prior = await svc.one(client,'select request_hash from library.idempotency_records where actor=$1 and scope=$2 and key=$3',[actor,'operations:'+kind,key]);
  if (prior) {
    assert(prior.request_hash === svc.hash(source),'Mã tham chiếu đã ghi sổ với nội dung khác. Dùng luồng xử lý phiếu hoặc đảo giao dịch để điều chỉnh.');
    return {action:'SKIP',summary:'Đã ghi sổ'};
  }
  if (kind === 'transfers') {
    const [,from,to,amount,reason] = values;
    const data = {from:await wallet(client,from),to:await wallet(client,to),amount:money(Number(amount)),reason:text(reason,'Lý do',2000,true)};
    assert(data.from!==data.to && data.amount>0,'Chọn hai ví khác nhau và số tiền lớn hơn 0.');
    return {action:'CREATE',data:{key,source,input:data},summary:`${from} → ${to} · ${data.amount.toLocaleString('vi-VN')} đ`};
  }
  const [,readerCode,copies,borrowDate,dueDate,conditionNote,walletCode,deposit,warning] = values;
  const reader = await svc.one(client,'select id from library.readers where code=$1',[readerCode]);
  assert(reader,'Không tìm thấy độc giả '+readerCode);
  const codes = copies.split(',').map(code=>code.trim()).filter(Boolean);
  const copiesFound = await svc.rows(client,'select id from library.book_copies where code=any($1::text[])',[codes]);
  assert(copiesFound.length===codes.length,'Có mã cuốn trùng hoặc không tồn tại.');
  const data = {readerId:reader.id,copyIds:copiesFound.map(copy=>copy.id),borrowDate:date(borrowDate),
    conditionNote:text(conditionNote,'Tình trạng bàn giao',2000,true),warningAcknowledged:warning==='Có'};
  const quote = await svc.loanQuote(client,data);
  assert(quote.dueDate===dueDate,'Hạn trả theo chính sách là '+quote.dueDate);
  assert(quote.deposit===money(Number(deposit)),'Cọc đã thu phải khớp số tiền theo chính sách: '+quote.deposit+' đ.');
  assert(!quote.overdue || data.warningAcknowledged,'Độc giả có sách quá hạn. Xác nhận đã xem cảnh báo.');
  if (quote.deposit) { data.walletId=await wallet(client,walletCode); data.depositConfirmed=true; }
  data.quoteToken=svc.loanQuoteToken(quote);
  return {action:'CREATE',data:{key,source,input:data},summary:`${readerCode} · ${codes.length} cuốn · hạn ${dueDate} · cọc ${quote.deposit.toLocaleString('vi-VN')} đ`};
}

export async function previewOperations(client, actor, buffer, kind) {
  const [name, headers] = schema(kind);
  checkArchive(buffer);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer);
  const sheet = book.getWorksheet(name);
  assert(sheet && headers.every((header,index)=>value(sheet.getRow(1).getCell(index+1))===header),'Hãy dùng đúng mẫu Excel của mục này.');
  assert(sheet.rowCount<=1001,'Tối đa 1.000 dòng.');
  const preview = [], seen = new Set(), readerIds = new Set(), copyIds = new Set();
  const balances = new Map();
  if (kind === 'transfers') {
    const totals = await svc.rows(client,`select w.id,w.opening_balance_vnd
      + coalesce(sum(case when e.direction='IN' then e.amount_vnd else -e.amount_vnd end),0) as balance
      from library.wallets w left join library.cash_entries e on e.wallet_id=w.id group by w.id`);
    for (const entry of totals) balances.set(entry.id,Number(entry.balance));
  }
  for (let row=2; row<=sheet.rowCount; row++) {
    const cells = headers.map((_,index)=>sheet.getRow(row).getCell(index+1));
    const values = cells.map(cell=>String(value(cell)).trim());
    if (!values.some(Boolean) && !cells.some(cell=>cell.formula)) continue;
    const reference = values[0] || values[2];
    try {
      assert(!cells.some(cell=>cell.formula),'Cột nhập không được chứa công thức.');
      const unique = kind==='readers' ? phone(values[2]) : reference;
      assert(!seen.has(unique),'Dòng bị trùng trong file.');
      seen.add(unique);
      const plan = kind==='readers' ? await planReader(client,values) : await planOperation(client,actor,kind,values);
      if (kind==='readers' && plan.data?.id) {
        assert(!readerIds.has(plan.data.id),'Mã độc giả đã có trong một dòng khác.');
        readerIds.add(plan.data.id);
      }
      if (kind==='transfers' && plan.data) {
        const {from,to,amount} = plan.data.input;
        assert(balances.get(from)>=amount,'Số dư ví nguồn không đủ ở dòng này.');
        balances.set(from,balances.get(from)-amount);
        balances.set(to,balances.get(to)+amount);
      }
      if (kind==='loans' && plan.data) {
        for (const id of plan.data.input.copyIds) {
          assert(!copyIds.has(id),'Cuốn này đã có trong một phiếu khác cùng file.');
          copyIds.add(id);
        }
      }
      preview.push({row,reference,...plan});
    } catch (error) { preview.push({row,reference,error:error.message}); }
  }
  assert(preview.length,'File không có dữ liệu.');
  const plan = preview.filter(row=>row.data);
  await client.query('select pg_advisory_xact_lock(hashtext($1))',['excel-preview:'+actor]);
  await client.query('delete from library.import_rows where job_id in (select id from library.import_jobs where created_by=$1)',[actor]);
  await client.query('delete from library.import_jobs where created_by=$1',[actor]);
  let jobId = null;
  if (plan.length && !preview.some(row=>row.error)) {
    const job = await svc.one(client,"insert into library.import_jobs(file_hash,mode,status,created_by) values($1,$2,'VALIDATED',$3) returning id",[svc.hash(buffer),'OPS:'+kind,actor]);
    jobId = job.id;
    for (const row of plan) await client.query("insert into library.import_rows(job_id,sheet,row_number,data,errors,planned_action) values($1,$2,$3,$4,'[]',$5)",
      [jobId,name,row.row,JSON.stringify(row.data),row.action]);
  }
  return {jobId,rows:preview.map(({data,...row})=>row)};
}

export async function commitOperations(client, actor, id) {
  await client.query('select pg_advisory_xact_lock(hashtext($1))',['excel-preview:'+actor]);
  const job = await svc.one(client,"select * from library.import_jobs where id=$1 and created_by=$2 and status='VALIDATED' and mode like 'OPS:%' for update",[id,actor]);
  assert(job,'Bản xem trước đã hết hiệu lực.');
  const kind = job.mode.slice(4);
  const plan = await svc.rows(client,'select * from library.import_rows where job_id=$1 order by row_number',[id]);
  for (const row of plan) {
    const p = row.data;
    if (kind==='readers') {
      if (row.planned_action==='UPDATE') await editReader(client,actor,p);
      else await svc.createReader(client,actor,p);
    } else {
      await svc.idempotent(client,actor,'operations:'+kind,p.key,p.source,async()=>{
        const key = 'excel:'+svc.hash([kind,p.key]);
        const record = kind==='loans' ? await svc.issueLoan(client,actor,p.input,key) : await svc.transfer(client,actor,p.input,key);
        return {id:record.id,code:record.code};
      });
    }
  }
  await client.query('delete from library.import_rows where job_id=$1',[id]);
  await client.query('delete from library.import_jobs where id=$1',[id]);
  await svc.audit(client,actor,'IMPORT','import_jobs',id,null,{kind,count:plan.length});
  return {imported:plan.length};
}

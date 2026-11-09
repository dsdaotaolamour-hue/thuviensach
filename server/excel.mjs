import ExcelJS from 'exceljs';
import {assert,money,date,url,today} from './domain.mjs';
import {rows,one,hash,createBook,audit,addCopy} from './service.mjs';
export const TITLE_HEADERS=['STT','MÃ ĐẦU SÁCH','TÊN ĐẦU SÁCH','TÁC GIẢ','THỂ LOẠI','NHÀ XUẤT BẢN','NGÔN NGỮ','NGÀY NHẬP','LINK ẢNH BÌA','MÔ TẢ SÁCH','NĂM XUẤT BẢN','ISBN','GIÁ BÌA (đ)','HIỂN THỊ WEB','TỔNG SỐ CUỐN','CÓ SẴN','ĐANG MƯỢN','ĐANG SỬA','SỐ TRANG','TÌNH TRẠNG PHÁT HÀNH','NHÓM ĐƠN GIÁ TRANG','VERSION'];
export const COPY_HEADERS=['STT','MÃ SÁCH','TÌNH TRẠNG','LOẠI','TRẠNG THÁI','VỊ TRÍ KỆ','NGÀY NHẬP','GHI CHÚ','MÃ ĐẦU SÁCH','TÊN ĐẦU SÁCH','VERSION'];
const safe=value=>typeof value==='string'&&/^[=+@-]/.test(value)?"'"+value:value;
const titleFields = {
  title:'title', author:'authors', category:'category', publisher:'publisher', language:'language',
  acquiredOn:'acquired_on', coverUrl:'cover_url', description:'description', year:'publication_year', isbn:'isbn',
  price:'cover_price_vnd', showOnWeb:'show_on_web', pages:'page_count', publishStatus:'publication_status',
  languageGroup:'compensation_language_group'
};
const copyFields = {condition:'physical_condition',mediaType:'media_type',shelf:'shelf_location',acquiredOn:'acquired_on',note:'condition_note'};
const normalized = value => value == null ? '' : String(value).trim().replace(/^'(?=[=+@-])/,'');
export function value(cell) {
  const v=cell.value; if(v==null) return '';
  if(v instanceof Date) return v.toISOString().slice(0,10);
  if(typeof v==='object') {
    if(v.richText) return v.richText.map(x=>x.text).join('');
    if(v.hyperlink) return v.text||v.hyperlink;
    if(v.formula||v.sharedFormula) return v.result??'';
  }
  return v;
}
export function checkArchive(buffer) {
  assert(buffer.length<=5*1024*1024,'File tối đa 5MB.');
  assert(buffer.length>=4 && buffer.readUInt32LE(0)===0x04034b50,'Chỉ nhận file .xlsx.');
  // Inspect central directory before decompression: reject macros, external relationships and zip bombs.
  let total=0,entries=0;
  for(let i=0;i<buffer.length-46;i++) if(buffer.readUInt32LE(i)===0x02014b50) {
    const size=buffer.readUInt32LE(i+24),n=buffer.readUInt16LE(i+28),extra=buffer.readUInt16LE(i+30),comment=buffer.readUInt16LE(i+32);
    const name=buffer.subarray(i+46,i+46+n).toString(); total+=size; entries++;
    assert(!/vbaProject|externalLinks|\.bin$|\.\.\//i.test(name),'Không nhận macro hoặc liên kết workbook ngoài.');
    i+=45+n+extra+comment;
  }
  assert(entries>0&&entries<=500&&total<=40*1024*1024,'Workbook giải nén quá lớn hoặc không hợp lệ.');
}
export async function inspectWorkbook(buffer) {
  checkArchive(buffer); const wb=new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
  return {sha256:hash(buffer),sheets:wb.worksheets.map(s=>({name:s.name,rows:s.rowCount,headers:s.getRow(1).values.slice(1),
    fields:s.getRow(1).values.slice(1).map((h,i)=>({column:i+1,header:h,formula:[2,3,4].some(n=>!!s.getRow(n).getCell(i+1).formula)}))}))};
}
export async function validateImport(c,actor,buffer,mode) {
  assert(['CREATE','UPDATE','SYNC'].includes(mode),'Chọn chế độ nhập hợp lệ.');
  checkArchive(buffer); const wb=new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
  assert(wb.getWorksheet('ĐẦU SÁCH')&&wb.getWorksheet('SÁCH'),'Thiếu sheet ĐẦU SÁCH hoặc SÁCH.');
  const planned=[]; let count=0;
  for(const [sheetName,headers,kind] of [['ĐẦU SÁCH',TITLE_HEADERS,'title'],['SÁCH',COPY_HEADERS,'copy']]) {
    const sh=wb.getWorksheet(sheetName);
    headers.slice(0,kind==='title'?18:10).forEach((h,i)=>assert(value(sh.getRow(1).getCell(i+1))===h,`${sheetName}: sai tiêu đề cột ${i+1}, cần ${h}.`));
    assert(sh.rowCount<=10000,'Workbook quá nhiều dòng.');
    for(let n=2;n<=sh.rowCount;n++) {
      const row=sh.getRow(n),code=String(value(row.getCell(2))||'').trim();
      if(!code) continue; count++; assert(count<=2000,'Tối đa 2.000 dòng dữ liệu.');
      const errors=[]; const v=i=>value(row.getCell(i));
      let data={kind,code}, action=mode, changes=[];
      try {
        assert((kind==='title'?/^DS\d{3,}$/:/^DS\d{3,}-\d{3,}$/).test(code),'Mã không đúng DS001 / DS001-001.');
        const writable=kind==='title'?[2,3,4,5,6,7,8,9,10,11,12,13,14,19,20,21,22]:[2,3,4,6,7,8,11];
        writable.forEach(i=>assert(!row.getCell(i).formula,`Cột nhập ${i} không được chứa công thức.`));
        if(kind==='title') {
          assert(String(v(3)).trim(),'Thiếu tên đầu sách (mã mẫu trống không được nhập thành sách thật).');
          data={...data,title:String(v(3)),author:String(v(4)),category:String(v(5)||'Chưa phân loại'),publisher:String(v(6)),language:String(v(7)||'Tiếng Việt'),acquiredOn:v(8)||null,coverUrl:String(v(9)),description:String(v(10)),year:v(11)||null,isbn:String(v(12)),price:v(13)===''?null:Number(v(13)),showOnWeb:['Có',true,'TRUE'].includes(v(14)),pages:v(19)===''?null:Number(v(19)),publishStatus:({'Đang phát hành':'IN_PRINT','Ngừng phát hành':'OUT_OF_PRINT','Chưa rõ':'UNKNOWN'})[v(20)]||String(v(20)||'UNKNOWN'),languageGroup:String(v(21)||''),version:Number(v(22))||null,copiesCount:0};
          assert(['Có','Không',true,false,'TRUE','FALSE',''].includes(v(14)),'HIỂN THỊ WEB cần Có/Không.');
          if(data.price!=null) money(data.price,'Giá bìa'); if(data.pages!=null) assert(Number.isInteger(data.pages)&&data.pages>0,'Số trang không hợp lệ.');
          if(data.year!=null) assert(Number.isInteger(Number(data.year))&&data.year>=1000&&data.year<=9999,'Năm xuất bản không hợp lệ.');
          assert(['IN_PRINT','OUT_OF_PRINT','UNKNOWN'].includes(data.publishStatus),'Tình trạng phát hành không hợp lệ.');
          assert(!data.languageGroup||['VIETNAMESE','FOREIGN'].includes(data.languageGroup),'Nhóm ngôn ngữ cần VIETNAMESE/FOREIGN.');
          url(data.coverUrl); if(data.acquiredOn) date(data.acquiredOn);
        } else {
          data={...data,titleCode:code.replace(/-\d+$/,''),condition:String(v(3)||'Tốt'),mediaType:String(v(4)||'Sách'),status:String(v(5)),shelf:String(v(6)),acquiredOn:v(7)||today(),note:String(v(8)),version:Number(v(11))||null};
          date(data.acquiredOn);
        }
        const old=await one(c,kind==='title'
          ? 'select t.*,g.name category from library.book_titles t left join library.book_categories g on g.id=t.category_id where t.code=$1'
          : 'select * from library.book_copies where code=$1',[code]);
        if (mode==='UPDATE') assert(old,'Không tìm thấy mã để cập nhật.');
        action=old?'UPDATE':'CREATE';
        if (old) {
          const fields=kind==='title'?titleFields:copyFields;
          for (const [key,column] of Object.entries(fields)) {
            const optionalColumn = {pages:19,publishStatus:20,languageGroup:21}[key];
            if (kind==='title' && optionalColumn && value(sh.getRow(1).getCell(optionalColumn))!==TITLE_HEADERS[optionalColumn-1]) {
              data[key]=old[column];
              continue;
            }
            if (key==='acquiredOn' && !v(kind==='title'?8:7)) data[key]=old[column];
            if (typeof data[key]==='string') data[key]=normalized(data[key]);
            if (normalized(data[key])!==normalized(old[column])) changes.push({field:key,from:old[column],to:data[key]});
          }
          if (!changes.length) action='SKIP';
          else {
            if (mode==='UPDATE' || data.version) assert(data.version===old.version,'VERSION đã thay đổi hoặc bị thiếu; xuất file mới.');
            assert(!old.archived_at,'Đầu sách đã lưu trữ.');
            data.version=old.version;
          }
        }
        if(kind==='copy') {
          if(action==='CREATE') assert(!data.status||data.status==='Có sẵn','Cuốn mới chỉ được Có sẵn; không nhập giao dịch bằng Excel.');
          const parent=await one(c,'select id from library.book_titles where code=$1',[data.titleCode]);
          assert(parent||planned.some(x=>x.data.kind==='title'&&x.data.code===data.titleCode&&!x.errors.length),'Không tìm thấy đầu sách tương ứng.');
        }
        assert(!planned.some(x=>x.data.kind===kind&&x.data.code===code),'Trùng mã trong workbook.');
      } catch(e) { errors.push(e.message); }
      planned.push({sheet:sheetName,row:n,data,errors,action,changes});
    }
  }
  assert(planned.length>0,'Không có dữ liệu sách.');
  await c.query('select pg_advisory_xact_lock(hashtext($1))',['excel-preview:'+actor]);
  await c.query(`delete from library.import_rows where job_id in
    (select id from library.import_jobs where created_by=$1)`,[actor]);
  await c.query(`delete from library.import_jobs where created_by=$1`,[actor]);
  const status=planned.some(x=>x.errors.length)?'INVALID':planned.every(x=>x.action==='SKIP')?'UNCHANGED':'VALIDATED';
  const job=status==='VALIDATED'
    ? await one(c,'insert into library.import_jobs(file_hash,mode,status,created_by) values($1,$2,$3,$4) returning *',[hash(buffer),mode,status,actor])
    : {status};
  if (job.id) for(const r of planned.filter(row=>row.action!=='SKIP')) {
    await c.query('insert into library.import_rows(job_id,sheet,row_number,data,errors,planned_action) values($1,$2,$3,$4,$5,$6)',[job.id,r.sheet,r.row,JSON.stringify(r.data),'[]',r.action]);
  }
  return {job,rows:planned};
}
export async function commitImport(c,actor,id) {
  await c.query('select pg_advisory_xact_lock(hashtext($1))',['excel-preview:'+actor]);
  const job=await one(c,'select * from library.import_jobs where id=$1 and created_by=$2 for update',[id,actor]);
  assert(job?.status==='VALIDATED' && ['CREATE','UPDATE','SYNC'].includes(job.mode),'Job chưa hợp lệ hoặc đã nhập.');
  const planned=await rows(c,'select * from library.import_rows where job_id=$1 order by case when sheet=\'ĐẦU SÁCH\' then 0 else 1 end,row_number',[id]);
  // Serialize manual and imported title-code generation.
  await c.query("select pg_advisory_xact_lock(hashtext('book-code-import'))");
  for(const r of planned) {
    const p=r.data;
    const create=r.planned_action==='CREATE';
    if(create&&p.kind==='title') {
      await createBook(c,actor,{...p,importCode:p.code});
    } else if(create) {
      const t=await one(c,'select id from library.book_titles where code=$1',[p.titleCode]); const cp=await addCopy(c,t.id,p);
      await c.query('update library.book_copies set code=$2 where id=$1',[cp.id,p.code]);
    } else if(p.kind==='title') {
      const cat=await one(c,'insert into library.book_categories(name) values($1) on conflict(name) do update set name=excluded.name returning id',[p.category]);
      const result=await one(c,`update library.book_titles set title=$3,authors=$4,category_id=$5,publisher=$6,language=$7,acquired_on=$8,cover_url=$9,short_description=$10,description=$10,publication_year=$11,isbn=$12,cover_price_vnd=$13,show_on_web=$14,page_count=$15,publication_status=$16,compensation_language_group=$17,version=version+1,updated_at=now() where code=$1 and version=$2 returning *`,[p.code,p.version,p.title,p.author,cat.id,p.publisher,p.language,p.acquiredOn,p.coverUrl,p.description,p.year,p.isbn,p.price,p.showOnWeb,p.pages,p.publishStatus,p.languageGroup||null]);
      assert(result,`${p.code} đã thay đổi sau khi kiểm tra.`,409);
    } else {
      const result=await one(c,'update library.book_copies set physical_condition=$3,media_type=$4,shelf_location=$5,acquired_on=$6,condition_note=$7,version=version+1,updated_at=now() where code=$1 and version=$2 returning *',[p.code,p.version,p.condition,p.mediaType,p.shelf,p.acquiredOn,p.note]);
      assert(result,`${p.code} đã thay đổi sau khi kiểm tra.`,409);
    }
  }
  await c.query("select setval('library.title_seq',greatest((select last_value from library.title_seq),(select coalesce(max(substring(code from 3)::bigint),1) from library.book_titles)))");
  await c.query('delete from library.import_rows where job_id=$1',[id]);
  await c.query('delete from library.import_jobs where id=$1',[id]);
  await audit(c,actor,'IMPORT','import_jobs',id,null,{fileHash:job.file_hash,mode:job.mode,count:planned.length},'Nhập dữ liệu sách đã xem trước');
  return {imported:planned.length};
}
export async function exportBooks(c,template=false) {
  const wb=new ExcelJS.Workbook(); wb.creator='Thư viện sách Ngành Spa';
  const titles=wb.addWorksheet('ĐẦU SÁCH'),copies=wb.addWorksheet('SÁCH'),guide=wb.addWorksheet('HƯỚNG DẪN');
  titles.addRow(TITLE_HEADERS); copies.addRow(COPY_HEADERS);
  guide.addRows([['schema_version',1],['Chỉ nhập hai sheet sách; không nhập độc giả, tiền hoặc phiếu.'],['CREATE: mã DS001, DS001-001; UPDATE: bắt buộc VERSION từ file xuất.'],['Cột STT, tổng số, tồn, tên đầu sách tra cứu và trạng thái cuốn là chỉ đọc.'],['Trạng thái phát hành: IN_PRINT, OUT_OF_PRINT, UNKNOWN. Nhóm đơn giá: VIETNAMESE/FOREIGN.'],['Giá bìa/số trang trống được giữ là chưa biết, không mặc định giá giả.']]);
  if(!template) {
    const ts=await rows(c,`select t.*,g.name category,count(c.id) filter(where c.status not in ('LOST','RETIRED')) total,count(c.id) filter(where c.status='READY') available,count(c.id) filter(where c.status='ON_LOAN') borrowed,count(c.id) filter(where c.status='REPAIR') repair from library.book_titles t left join library.book_categories g on g.id=t.category_id left join library.book_copies c on c.title_id=t.id group by t.id,g.name order by t.code`);
    ts.forEach((t,i)=>titles.addRow([i+1,t.code,t.title,t.authors,t.category,t.publisher,t.language,t.acquired_on,t.cover_url,t.description,t.publication_year,t.isbn,t.cover_price_vnd,t.show_on_web?'Có':'Không',Number(t.total),Number(t.available),Number(t.borrowed),Number(t.repair),t.page_count,t.publication_status,t.compensation_language_group,t.version].map(safe)));
    const cs=await rows(c,'select c.*,t.code title_code,t.title from library.book_copies c join library.book_titles t on t.id=c.title_id order by c.code');
    const labels={READY:'Có sẵn',ON_LOAN:'Đang mượn',REPAIR:'Đang sửa',DAMAGED:'Hư nặng',LOST:'Mất',RETIRED:'Thanh lý'};
    cs.forEach((v,i)=>copies.addRow([i+1,v.code,v.physical_condition,v.media_type,labels[v.status],v.shelf_location,v.acquired_on,v.condition_note,v.title_code,v.title,v.version].map(safe)));
  }
  for(const sh of wb.worksheets) { sh.views=[{state:'frozen',ySplit:1}]; sh.getRow(1).font={bold:true}; sh.columns.forEach(col=>col.width=24); }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

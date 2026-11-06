// Restore only into a freshly migrated, unused database. Never overwrites a live system.
import {readFile} from 'node:fs/promises';
import {database,transaction} from '../server/db.mjs';
import {hash,rows,one,audit} from '../server/service.mjs';
import {assert} from '../server/domain.mjs';
const file=process.argv.find(v=>v.endsWith('.json'));assert(file,'Cú pháp: node --env-file=.env.local scripts/restore.mjs backup.json [--commit-empty-database]');
const backup=JSON.parse(await readFile(file,'utf8'));assert(backup.payload?.schemaVersion===2&&hash(backup.payload)===backup.checksum,'Sai schema version hoặc checksum backup.');
const order=['book_categories','book_titles','book_copies','readers','policy_versions','wallets','loans','loan_items','return_receipts','return_items','charges','financial_transactions','cash_entries','deposit_entries','charge_allocations','collection_contacts','reminder_events','system_settings','content_sections','content_links','analytics_daily','audit_logs','import_jobs','import_rows','backup_runs','print_documents'];
const db=database();
try {
  const actual=await rows(db,"select tablename from pg_tables where schemaname='library'");
  for(const name of Object.keys(backup.payload.data)) assert(order.includes(name),'Bảng ngoài danh sách cho phép: '+name);
  for(const name of order) assert(Array.isArray(backup.payload.data[name])&&actual.some(t=>t.tablename===name),'Thiếu bảng '+name);
  console.log(JSON.stringify({createdAt:backup.payload.createdAt,checksum:backup.checksum,rows:Object.fromEntries(order.map(n=>[n,backup.payload.data[n].length]))},null,2));
  if(!process.argv.includes('--commit-empty-database')) {console.log('Chỉ kiểm tra. Muốn nạp vào DB trống: thêm --commit-empty-database');}
  else {
    await transaction(async c=>{
      await c.query("select pg_advisory_xact_lock(hashtext('restore-empty-database'))");
      const admin=await one(c,'select id from library.admin_accounts where active');assert(admin,'Tạo admin mới trước khi restore.');
      for(const n of order.filter(n=>!['policy_versions','wallets','system_settings'].includes(n))) {
        const count=await one(c,`select count(*) n from library.${n}`);assert(Number(count.n)===0,'Database đã có dữ liệu tại '+n+'. Không ghi đè.');
      }
      await c.query('truncate '+order.map(n=>'library.'+n).join(',')+',library.idempotency_records');
      const metadata=await rows(c,"select table_name,column_name from information_schema.columns where table_schema='library'");
      for(const n of order){
        const pending=[...backup.payload.data[n]];let inserted;
        do {inserted=0;
          for(let index=0;index<pending.length;){const original=pending[index];const record={...original};
            for(const key of ['created_by','actor_id','actor'])if(record[key]!=null)record[key]=admin.id;
            const selfKey={book_copies:'replacement_for_copy_id',financial_transactions:'reversal_of_id',deposit_entries:'source_deposit_entry_id',charges:'reverses_charge_id'}[n];
            if(selfKey&&record[selfKey]&&pending.some(x=>x.id===record[selfKey])){index++;continue;}
            const cols=Object.keys(record);assert(cols.every(k=>metadata.some(m=>m.table_name===n&&m.column_name===k)),'Cột lạ trong '+n);
            // jsonb values must be serialized explicitly for pg.
            const values=cols.map(k=>record[k]!==null&&typeof record[k]==='object'?JSON.stringify(record[k]):record[k]);
            await c.query(`insert into library.${n}(${cols.map(k=>'"'+k+'"').join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')})`,values);
            pending.splice(index,1);inserted++;
          }
          assert(inserted>0||pending.length===0,'Quan hệ tự tham chiếu không hợp lệ: '+n);
        }while(pending.length);
      }
      for(const [seq,table,prefix] of [['title','book_titles',2],['reader','readers',2],['loan','loans',2],['receipt','return_receipts',2],['transaction','financial_transactions',2]]) {
        await c.query(`select setval('library.${seq}_seq',greatest(1,(select coalesce(max(substring(code from ${prefix+1})::bigint),0) from library.${table})))`);
      }
      await audit(c,admin.id,'RESTORE_EMPTY_DATABASE','backup_runs',null,null,{checksum:backup.checksum},'Khôi phục vào database mới; giữ database cũ để đối chiếu');
    });
    console.log('Đã restore trong transaction. Chạy đối soát trước khi chuyển APP sang DB mới.');
  }
} finally {await db.end();}

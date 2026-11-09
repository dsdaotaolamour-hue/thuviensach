import {randomBytes, randomInt} from 'node:crypto';
import {assert} from './domain.mjs';
import {audit, hash, one, rows} from './service.mjs';

const cleared = [
  'book_categories','book_titles','book_copies','readers','wallets','loans','loan_items',
  'return_receipts','return_items','charges','financial_transactions','cash_entries',
  'deposit_entries','charge_allocations','collection_contacts','reminder_events','analytics_daily',
  'audit_logs','import_jobs','import_rows','backup_runs','print_documents'
];
const backupTables = [...cleared,'policy_versions','system_settings','content_sections','content_links'].sort();
const qualified = tables => tables.map(table => 'library.' + table).join(',');
const keyFor = (actor, kind) => 'reset_' + kind + '_' + actor;

async function save(client, key, value) {
  await client.query(`insert into library.system_settings(key,value) values($1,$2)
    on conflict(key) do update set value=excluded.value`, [key, JSON.stringify(value)]);
}

export async function resetChallenge(client, actor) {
  const code = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + 10000;
  await save(client,keyFor(actor,'challenge'),{code,expiresAt});
  return {code,expiresAt};
}

async function snapshot(client) {
  const data = {};
  for (const table of backupTables) {
    const where = table === 'system_settings' ? "where left(t.key,6) <> 'reset_'" : '';
    data[table] = await rows(client,`select t.* from library.${table} t ${where} order by to_jsonb(t)::text`);
  }
  return data;
}

export async function prepareReset(client, actor, input) {
  const key = keyFor(actor,'challenge');
  const challenge = (await one(client,'select value from library.system_settings where key=$1 for update',[key]))?.value;
  assert(challenge && challenge.expiresAt >= Date.now() && input.code === challenge.code,'Mã đã đổi hoặc không đúng. Nhập mã mới.');
  assert(input.phrase === 'tôi đồng ý reset','Nhập đúng cụm từ xác nhận.');
  const data = await snapshot(client);
  const payload = {schemaVersion:2,appVersion:'1.0.0',createdAt:new Date().toISOString(),timezone:'Asia/Ho_Chi_Minh',data};
  const backup = JSON.stringify({payload,checksum:hash(payload)},null,2);
  const token = randomBytes(32).toString('hex');
  await save(client,keyFor(actor,'ticket'),{tokenHash:hash(token),fileHash:hash(backup),dataHash:hash(data),expiresAt:Date.now()+15*60*1000});
  await client.query('delete from library.system_settings where key=$1',[key]);
  return {token,backup};
}

export async function commitReset(client, actor, input) {
  assert(typeof input.token === 'string' && /^[a-f0-9]{64}$/.test(input.token),'Mã xác nhận reset không hợp lệ.');
  await client.query("set local lock_timeout = '5s'");
  await client.query('lock table '+qualified([...backupTables,'idempotency_records'].sort())+' in access exclusive mode');
  const key = keyFor(actor,'ticket');
  const ticket = (await one(client,'select value from library.system_settings where key=$1',[key]))?.value;
  assert(ticket && ticket.expiresAt >= Date.now() && ticket.tokenHash === hash(input.token),'Phiên reset hết hạn. Hãy tạo bản sao lưu mới.');
  assert(input.fileHash === ticket.fileHash,'File đã chọn không khớp bản sao lưu của phiên reset.');
  assert(hash(await snapshot(client)) === ticket.dataHash,'Dữ liệu đã thay đổi sau khi sao lưu. Hãy tạo bản sao lưu mới.',409);
  await client.query('truncate '+qualified([...cleared,'idempotency_records']));
  await client.query("delete from library.system_settings where key <> 'library'");
  await client.query("insert into library.wallets(code,display_name,type) values('V01','Momo','MOMO'),('V02','Ngân hàng','BANK'),('V03','Tiền mặt','CASH')");
  for (const name of ['title','reader','loan','receipt','transaction']) {
    await client.query(`alter sequence library.${name}_seq restart with 1`);
  }
  await audit(client,actor,'RESET_DATABASE','system_settings',null,null,{backupHash:ticket.fileHash});
  return {reset:true};
}

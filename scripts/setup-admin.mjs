import {database} from '../server/db.mjs';
const id=process.env.ADMIN_USER_ID;
if(!/^[0-9a-f-]{36}$/i.test(id||'')) throw new Error('Điền ADMIN_USER_ID: UUID trong Supabase Authentication > Users.');
const db=database();
try {
  const user=(await db.query('select id from auth.users where id=$1',[id])).rows[0];
  if(!user) throw new Error('UUID chưa tồn tại trong Supabase Auth.');
  await db.query('insert into library.admin_accounts(id) values($1) on conflict(id) do nothing',[id]); console.log('Đã gắn tài khoản admin duy nhất.');
} finally {await db.end();}

import {readFile,readdir} from 'node:fs/promises';
import {database} from '../server/db.mjs';
import {createHash} from 'node:crypto';
const db=database();
try {
  await db.query('create table if not exists public.lamour_migrations(name text primary key,checksum text not null,applied_at timestamptz default now())');
  for(const name of (await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()) {
    const sql=await readFile('supabase/migrations/'+name,'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
    const old=(await db.query('select checksum from public.lamour_migrations where name=$1',[name])).rows[0];
    if(old) {if(old.checksum!==checksum) throw new Error('Migration đã chạy bị thay đổi: '+name);continue;}
    await db.query(sql); await db.query('insert into public.lamour_migrations(name,checksum) values($1,$2)',[name,checksum]); console.log('Applied',name);
  }
} finally {await db.end();}

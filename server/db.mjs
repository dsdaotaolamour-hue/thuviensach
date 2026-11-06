import pg from 'pg';
let pool;
export function database() {
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL chưa được cấu hình');
  if(!pool) pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
  return pool;
}
pg.types.setTypeParser(1082, value=>value);
pg.types.setTypeParser(20, value=>Number(value));
export async function transaction(fn, provider=database()) {
  const c=await provider.connect();
  try { await c.query('begin'); const result=await fn(c); await c.query('commit'); return result; }
  catch(e) { await c.query('rollback'); throw e; } finally { c.release(); }
}

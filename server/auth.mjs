import {createHash,randomBytes} from 'node:crypto';
import {assert,AppError,text} from './domain.mjs';
import {one} from './service.mjs';
export function cookies(request) {
  return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(v=>{const n=v.indexOf('=');return [v.slice(0,n).trim(),decodeURIComponent(v.slice(n+1))];}));
}
export async function authFetch(endpoint,body,token,method='POST') {
  assert(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY,'Chưa cấu hình Supabase Auth.',503,'NOT_CONFIGURED');
  const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/'+endpoint,{
    method,headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new AppError('Thông tin xác thực không hợp lệ hoặc phiên đã hết hạn.',401,'AUTH_FAILED'); return data;
}
export function appOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (configuredOrigin) return configuredOrigin;

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === 'production' && productionDomain) {
    return 'https://' + productionDomain;
  }
  return null;
}

export function sessionCookies(response,session) {
  const secure=appOrigin()?.startsWith('https://')?'; Secure':'';
  const age=session?43200:0;
  response.headers.append('Set-Cookie',`lamour_access=${session?.access_token||''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure}`);
  response.headers.append('Set-Cookie',`lamour_refresh=${session?.refresh_token||''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure}`);
  response.headers.append('Set-Cookie',`lamour_session=${session?.sessionSecret||''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure}`);
}
export async function requireAdmin(request,c) {
  const jar=cookies(request); assert(jar.lamour_access, 'Vui lòng đăng nhập.',401);
  const tokenHash=createHash('sha256').update(jar.lamour_session||'').digest('hex');
  const stored=await one(c,'select * from library.admin_sessions where token_hash=$1 and revoked_at is null and idle_expires_at>now() and absolute_expires_at>now()',[tokenHash]);
  assert(stored,'Phiên đã hết hạn; vui lòng đăng nhập lại.',401);
  let user,refresh=null;
  try { user=await authFetch('user',null,jar.lamour_access,'GET'); }
  catch(e) {
    if(e.status!==401||!jar.lamour_refresh) throw e;
    refresh=await authFetch('token?grant_type=refresh_token',{refresh_token:jar.lamour_refresh});
    refresh.sessionSecret=jar.lamour_session; user=refresh.user;
  }
  const admin=await one(c,'select id from library.admin_accounts where id=$1 and active',[user.id]);
  assert(admin&&stored.account_id===admin.id,'Tài khoản không có quyền quản trị.',403);
  await c.query("update library.admin_sessions set last_seen_at=now(),idle_expires_at=least(absolute_expires_at,now()+interval '30 minutes') where id=$1",[stored.id]);
  return {id:admin.id,email:user.email,refresh,token:refresh?.access_token||jar.lamour_access};
}
export async function login(request,c,p) {
  const email=text(p.email,'Email',320,true),password=text(p.password,'Mật khẩu',1000,true);
  const source=(request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();
  const bucket=createHash('sha256').update(email.toLowerCase()+':'+source).digest('hex');
  const attempt=await one(c,`insert into library.auth_attempts(bucket,attempts,window_started) values($1,1,now())
    on conflict(bucket) do update set attempts=case when library.auth_attempts.window_started<now()-interval '15 minutes' then 1 else library.auth_attempts.attempts+1 end,
    window_started=case when library.auth_attempts.window_started<now()-interval '15 minutes' then now() else library.auth_attempts.window_started end returning attempts`,[bucket]);
  assert(attempt.attempts<=10,'Thử lại sau 15 phút hoặc dùng chức năng khôi phục trong Supabase Auth.',429,'RATE_LIMITED');
  const session=await authFetch('token?grant_type=password',{email,password});
  const admin=await one(c,'select id from library.admin_accounts where id=$1 and active',[session.user.id]);
  assert(admin,'Không thể đăng nhập bằng tài khoản này.',403);
  await c.query('delete from library.auth_attempts where bucket=$1',[bucket]);
  session.sessionSecret=randomBytes(32).toString('hex');
  await c.query("insert into library.admin_sessions(account_id,token_hash,idle_expires_at,absolute_expires_at) values($1,$2,now()+interval '30 minutes',now()+interval '12 hours')",[admin.id,createHash('sha256').update(session.sessionSecret).digest('hex')]);
  return session;
}
export async function reauthenticate(c,admin,password) {
  const session=await authFetch('token?grant_type=password',{email:admin.email,password:text(password,'Mật khẩu xác nhận',1000,true)});
  assert(session.user.id===admin.id,'Tài khoản không khớp.',403);
}

begin;
create table library.auth_attempts(bucket text primary key,attempts integer not null,window_started timestamptz not null);
alter table library.auth_attempts enable row level security;
revoke all on library.auth_attempts from public;
commit;

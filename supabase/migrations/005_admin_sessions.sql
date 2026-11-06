begin;
create table library.admin_sessions (
  id uuid primary key default gen_random_uuid(),account_id uuid not null references library.admin_accounts,
  token_hash text not null unique,created_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,absolute_expires_at timestamptz not null,revoked_at timestamptz
);
alter table library.admin_sessions enable row level security;
revoke all on library.admin_sessions from public;
create index sessions_account on library.admin_sessions(account_id);
commit;

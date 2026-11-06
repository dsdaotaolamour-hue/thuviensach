-- Run once in a new Supabase project. Business tables intentionally outside public/Data API.
begin;
create schema library;
revoke all on schema library from public;
create sequence library.title_seq;
create sequence library.reader_seq;
create sequence library.loan_seq;
create sequence library.receipt_seq;
create sequence library.transaction_seq;
create table library.admin_accounts (
  id uuid primary key, singleton boolean not null default true unique check(singleton),
  active boolean not null default true, created_at timestamptz not null default now()
);
-- Passwords and sessions belong to Supabase Auth, never to application tables.
create table library.book_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  code text unique, sort_order integer not null default 0, active boolean not null default true
);
create table library.book_titles (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  title text not null check(length(trim(title))>0), authors text not null default '',
  category_id uuid references library.book_categories, publisher text not null default '',
  language text not null default 'Tiếng Việt', compensation_language_group text check(compensation_language_group in ('VIETNAMESE','FOREIGN')),
  acquired_on date, publication_year integer check(publication_year between 1000 and 9999), isbn text,
  page_count integer check(page_count>0), cover_price_vnd bigint check(cover_price_vnd>=0),
  publication_status text not null default 'UNKNOWN' check(publication_status in ('IN_PRINT','OUT_OF_PRINT','UNKNOWN')),
  cover_url text not null default '', short_description text not null default '', description text not null default '',
  show_on_web boolean not null default false, archived_at timestamptz,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table library.book_copies (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  title_id uuid not null references library.book_titles, physical_condition text not null default 'Tốt',
  media_type text not null default 'Sách', condition_note text not null default '',
  status text not null default 'READY' check(status in ('READY','ON_LOAN','REPAIR','DAMAGED','LOST','RETIRED')),
  shelf_location text not null default '', acquired_on date, acquisition_note text not null default '',
  replacement_for_copy_id uuid references library.book_copies, retired_on date,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table library.readers (
  id uuid primary key default gen_random_uuid(), code text not null unique, full_name text not null check(length(trim(full_name))>0),
  phone_normalized text not null unique check(phone_normalized ~ '^0[0-9]{9,10}$'), phone_display text not null,
  reader_category text not null check(reader_category in ('COMPANY','INTERNAL','WALK_IN')),
  policy_group_default text not null check(policy_group_default in ('COMPANY','WALK_IN')),
  account_status text not null default 'Hoạt động', organization text, email text, address text,
  registered_on date not null default current_date, notes text not null default '', archived_at timestamptz,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(policy_group_default=case when reader_category='WALK_IN' then 'WALK_IN' else 'COMPANY' end)
);
create table library.policy_versions (
  id uuid primary key default gen_random_uuid(), version integer not null unique,
  company_term_months integer not null check(company_term_months>0), walkin_term_months integer not null check(walkin_term_months>0),
  walkin_deposit_vnd bigint not null check(walkin_deposit_vnd>=0), late_fee_vnd_per_day bigint not null check(late_fee_vnd_per_day>=0),
  replacement_technical_fee_vnd bigint not null check(replacement_technical_fee_vnd>=0), out_of_print_multiplier integer not null check(out_of_print_multiplier>0),
  vietnamese_page_rate integer not null check(vietnamese_page_rate>0), foreign_page_rate integer not null check(foreign_page_rate>0),
  loss_late_fee_rule text check(loss_late_fee_rule in ('CONFIRMATION_DATE','RESOLUTION_DATE')),
  unknown_price_priority_rule text check(unknown_price_priority_rule in ('REPLACE_FIRST','PAGE_RATE_FIRST')),
  effective_at timestamptz not null default now(), created_by uuid references library.admin_accounts, created_at timestamptz not null default now()
);
insert into library.policy_versions(version,company_term_months,walkin_term_months,walkin_deposit_vnd,late_fee_vnd_per_day,replacement_technical_fee_vnd,out_of_print_multiplier,vietnamese_page_rate,foreign_page_rate)
values(1,12,3,500000,5000,20000,3,1000,10000);
create table library.wallets (
  id uuid primary key default gen_random_uuid(), code text not null unique, display_name text not null unique,
  type text not null check(type in ('MOMO','BANK','CASH','OTHER')), account_holder text not null default '', account_number text not null default '',
  bank_name text not null default '', qr_url text not null default '', active boolean not null default true,
  opening_balance_vnd bigint not null default 0 check(opening_balance_vnd>=0), notes text not null default '',
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into library.wallets(code,display_name,type) values('V01','Momo','MOMO'),('V02','Ngân hàng','BANK'),('V03','Tiền mặt','CASH');
create table library.loans (
  id uuid primary key default gen_random_uuid(), code text not null unique, reader_id uuid not null references library.readers,
  policy_version_id uuid not null references library.policy_versions, reader_snapshot jsonb not null,
  policy_group_snapshot text not null, category_snapshot text not null, verification_note text not null default '',
  borrowed_on date not null, due_on date not null check(due_on>=borrowed_on),
  delivery_method text not null default 'Tại quầy', status text not null default 'ACTIVE' check(status in ('ACTIVE','PARTIAL','PENDING_SETTLEMENT','COMPLETED')),
  warning_acknowledged_at timestamptz, issued_at timestamptz not null default now(), completed_at timestamptz,
  notes text not null default '', created_by uuid references library.admin_accounts,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table library.loan_items (
  id uuid primary key default gen_random_uuid(), loan_id uuid not null references library.loans, copy_id uuid not null references library.book_copies,
  title_snapshot jsonb not null, condition_out text not null, condition_out_note text not null default '', due_on date not null,
  deposit_required_vnd bigint not null check(deposit_required_vnd>=0), deposit_wallet_id uuid references library.wallets,
  returned_on date, loss_confirmed_on date,
  resolution_status text not null default 'OPEN' check(resolution_status in ('OPEN','RETURNED','LOST_PENDING','RESOLVED')),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_open_loan_per_copy on library.loan_items(copy_id) where resolution_status='OPEN';
create table library.return_receipts (
  id uuid primary key default gen_random_uuid(), code text not null unique, loan_id uuid not null references library.loans,
  actual_return_on date not null, notes text not null default '', created_by uuid references library.admin_accounts, processed_at timestamptz not null default now()
);
create table library.return_items (
  id uuid primary key default gen_random_uuid(), receipt_id uuid not null references library.return_receipts, loan_item_id uuid not null unique references library.loan_items,
  outcome text not null check(outcome in ('GOOD','MINOR_DAMAGE','MAJOR_DAMAGE','LOST')),
  condition_in text not null, condition_note text not null default '', resulting_copy_status text not null,
  replacement_copy_id uuid references library.book_copies, decision_by text not null default '', decision_reason text not null default ''
);
create table library.charges (
  id uuid primary key default gen_random_uuid(), loan_item_id uuid not null references library.loan_items, receipt_id uuid references library.return_receipts,
  type text not null check(type in ('LATE_FEE','DAMAGE_COMPENSATION','LOSS_COMPENSATION','TECHNICAL_FEE','OTHER')),
  amount_vnd bigint not null check(amount_vnd>=0), calculation_snapshot jsonb not null, decided_by text, reason text not null,
  reverses_charge_id uuid unique references library.charges, created_by uuid references library.admin_accounts, created_at timestamptz not null default now()
);
create table library.financial_transactions (
  id uuid primary key default gen_random_uuid(), code text not null unique, type text not null,
  loan_id uuid references library.loans, reader_id uuid references library.readers, amount_vnd bigint not null check(amount_vnd>=0),
  occurred_at timestamptz not null default now(), transfer_reference text not null default '', reason text not null,
  reversal_of_id uuid unique references library.financial_transactions, idempotency_key text not null unique,
  created_by uuid references library.admin_accounts, created_at timestamptz not null default now()
);
create table library.cash_entries (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references library.financial_transactions,
  wallet_id uuid not null references library.wallets, direction text not null check(direction in ('IN','OUT')), amount_vnd bigint not null check(amount_vnd>0)
);
create table library.deposit_entries (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references library.financial_transactions,
  loan_item_id uuid not null references library.loan_items, source_deposit_entry_id uuid references library.deposit_entries,
  direction text not null check(direction in ('INCREASE','DECREASE')), purpose text not null check(purpose in ('COLLECT','REFUND','APPLY','REVERSE')),
  amount_vnd bigint not null check(amount_vnd>0)
);
create table library.charge_allocations (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references library.financial_transactions,
  charge_id uuid not null references library.charges, direction text not null check(direction in ('APPLY','REVERSE')), amount_vnd bigint not null check(amount_vnd>0)
);
create table library.collection_contacts (
  id uuid primary key default gen_random_uuid(), loan_id uuid not null references library.loans, contacted_at timestamptz not null default now(),
  channel text not null, content text not null, result text not null, next_followup_on date, created_by uuid references library.admin_accounts
);
create table library.reminder_events (
  id uuid primary key default gen_random_uuid(), loan_item_id uuid not null references library.loan_items, milestone text not null,
  due_date_snapshot date not null, status text not null default 'UNREAD', acknowledged_at timestamptz,
  unique(loan_item_id,milestone,due_date_snapshot)
);
create table library.system_settings(key text primary key,value jsonb not null,schema_version integer not null default 1);
insert into library.system_settings values ('library','{"libraryName":"Thư viện sách Ngành Spa","address":"","hotline":"","zaloOaId":"","termsOnPrint":"Không gia hạn. Được trả trước hạn. Bảo quản và trả sách theo nội quy thư viện."}',1);
create table library.content_sections(page_key text not null,section_key text not null,structured_content jsonb not null,published_version integer not null default 1,primary key(page_key,section_key));
create table library.content_links(key text primary key,label text not null,url text not null,qr_url text not null default '',year integer,active boolean not null default true,sort_order integer not null default 0);
create table library.analytics_daily(date date not null,event_name text not null,target_key text not null,count bigint not null default 0,primary key(date,event_name,target_key));
create table library.audit_logs (
  id uuid primary key default gen_random_uuid(), occurred_at timestamptz not null default now(), actor_id uuid references library.admin_accounts,
  action text not null,target_table text not null,target_id text, before_data jsonb,after_data jsonb,reason text not null default '',request_id uuid not null, ip_address inet
);
create table library.import_jobs(id uuid primary key default gen_random_uuid(),file_hash text not null,mode text not null,status text not null,created_by uuid references library.admin_accounts,created_at timestamptz not null default now());
create table library.import_rows(id uuid primary key default gen_random_uuid(),job_id uuid not null references library.import_jobs,sheet text not null,row_number integer not null,data jsonb not null,errors jsonb not null,planned_action text not null);
create table library.backup_runs(id uuid primary key default gen_random_uuid(),status text not null,schema_version integer not null default 1,checksum text, row_counts jsonb, storage_location text,created_at timestamptz not null default now());
create table library.print_documents(id uuid primary key default gen_random_uuid(),code text not null unique,loan_id uuid not null references library.loans,receipt_id uuid references library.return_receipts,type text not null,snapshot jsonb not null,template_version integer not null default 1,created_by uuid references library.admin_accounts,created_at timestamptz not null default now());
create table library.idempotency_records(actor uuid not null references library.admin_accounts,scope text not null,key text not null,request_hash text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor,scope,key));
create index loan_reader on library.loans(reader_id);
create index items_due on library.loan_items(due_on) where resolution_status='OPEN';
create index copies_title on library.book_copies(title_id);
create index deposits_item on library.deposit_entries(loan_item_id);
create index cash_wallet on library.cash_entries(wallet_id);
create index charges_item on library.charges(loan_item_id);
create index audit_time on library.audit_logs(occurred_at desc);
-- Defense in depth: no browser role can access business tables, including authenticated users.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='library' loop
    execute format('alter table library.%I enable row level security',t.tablename);
  end loop;
end $$;
create function library.immutable_row() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'APPEND_ONLY: history cannot be modified'; end $$;
do $$ declare n text; begin
  foreach n in array array['financial_transactions','cash_entries','deposit_entries','charge_allocations','charges','audit_logs','print_documents','policy_versions','return_receipts','return_items'] loop
    execute format('create trigger immutable_history before update or delete on library.%I for each row execute function library.immutable_row()',n);
  end loop;
end $$;
revoke all on all tables in schema library from public;
revoke all on all sequences in schema library from public;
revoke all on all functions in schema library from public;
commit;

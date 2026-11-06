-- CAI DAT MOI: run once on a new Supabase project. See docs/CAI_DAT.md.

-- 001_library.sql
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


-- 002_auth_attempts.sql
begin;
create table library.auth_attempts(bucket text primary key,attempts integer not null,window_started timestamptz not null);
alter table library.auth_attempts enable row level security;
revoke all on library.auth_attempts from public;
commit;


-- 003_ledger_guards.sql
begin;
alter table library.readers add column legacy_reader_type text;
-- Optional compatibility slot. No CCCD is requested by the UI; encrypted text only if added later.
alter table library.readers add column national_id_ciphertext text;
create function library.guard_deposit() returns trigger language plpgsql set search_path='' as $$
declare held bigint; begin
  perform id from library.loan_items where id=new.loan_item_id for update;
  select coalesce(sum(case when direction='INCREASE' then amount_vnd else -amount_vnd end),0) into held from library.deposit_entries where loan_item_id=new.loan_item_id;
  if new.direction='DECREASE' and new.amount_vnd>held then raise exception 'DEPOSIT_OVERDRAW'; end if;
  return new;
end $$;
create trigger guard_deposit before insert on library.deposit_entries for each row execute function library.guard_deposit();
create function library.guard_allocation() returns trigger language plpgsql set search_path='' as $$
declare paid bigint; due bigint; begin
  select amount_vnd into due from library.charges where id=new.charge_id for update;
  select coalesce(sum(case when direction='APPLY' then amount_vnd else -amount_vnd end),0) into paid from library.charge_allocations where charge_id=new.charge_id;
  if (new.direction='APPLY' and paid+new.amount_vnd>due) or (new.direction='REVERSE' and paid-new.amount_vnd<0) then raise exception 'ALLOCATION_OUT_OF_RANGE'; end if;
  return new;
end $$;
create trigger guard_allocation before insert on library.charge_allocations for each row execute function library.guard_allocation();
revoke all on all functions in schema library from public;
commit;


-- 004_excel_views.sql
-- Read-only projections of the original workbook. Formula columns stay computed.
begin;
create view library.excel_dau_sach with(security_invoker=true) as
select t.code "MÃ ĐẦU SÁCH",t.title "TÊN ĐẦU SÁCH",t.authors "TÁC GIẢ",g.name "THỂ LOẠI",t.publisher "NHÀ XUẤT BẢN",t.language "NGÔN NGỮ",t.acquired_on "NGÀY NHẬP",t.cover_url "LINK ẢNH BÌA",t.description "MÔ TẢ SÁCH",t.publication_year "NĂM XUẤT BẢN",t.isbn "ISBN",t.cover_price_vnd "GIÁ BÌA (đ)",case when t.show_on_web then 'Có' else 'Không' end "HIỂN THỊ WEB",
count(c.id) filter(where c.status not in ('LOST','RETIRED')) "TỔNG SỐ CUỐN",count(c.id) filter(where c.status='READY') "CÓ SẴN",count(c.id) filter(where c.status='ON_LOAN') "ĐANG MƯỢN",count(c.id) filter(where c.status='REPAIR') "ĐANG SỬA"
from library.book_titles t left join library.book_categories g on g.id=t.category_id left join library.book_copies c on c.title_id=t.id group by t.id,g.name;
create view library.excel_sach with(security_invoker=true) as
select c.code "MÃ SÁCH",c.physical_condition "TÌNH TRẠNG",c.media_type "LOẠI",c.status "TRẠNG THÁI",c.shelf_location "VỊ TRÍ KỆ",c.acquired_on "NGÀY NHẬP",c.condition_note "GHI CHÚ",t.code "MÃ ĐẦU SÁCH",t.title "TÊN ĐẦU SÁCH" from library.book_copies c join library.book_titles t on t.id=c.title_id;
create view library.deposit_balances with(security_invoker=true) as
select i.id loan_item_id,coalesce(sum(case when d.direction='INCREASE' then d.amount_vnd else -d.amount_vnd end),0) held from library.loan_items i left join library.deposit_entries d on d.loan_item_id=i.id group by i.id;
create view library.excel_doc_gia with(security_invoker=true) as
select r.code "MÃ ĐỌC GIẢ",r.full_name "HỌ VÀ TÊN ĐỌC GIẢ",r.phone_display "SỐ ĐIỆN THOẠI",r.national_id_ciphertext "SỐ CĂN CƯỚC CÔNG DÂN (MÃ HÓA)",r.reader_category "LOẠI KHÁCH",r.account_status "TRẠNG THÁI TÀI KHOẢN",r.email "EMAIL",r.address "ĐỊA CHỈ",r.registered_on "NGÀY ĐĂNG KÝ",r.notes "GHI CHÚ",
count(i.id) filter(where i.resolution_status='OPEN') "SÁCH ĐANG MƯỢN",coalesce(sum(b.held),0) "CỌC ĐANG GIỮ (đ)"
from library.readers r left join library.loans l on l.reader_id=r.id left join library.loan_items i on i.loan_id=l.id left join library.deposit_balances b on b.loan_item_id=i.id group by r.id;
create view library.excel_phieu_muon with(security_invoker=true) as
select l.code "MÃ PHIẾU",r.code "MÃ ĐỌC GIẢ",l.reader_snapshot->>'full_name' "TÊN ĐỌC GIẢ",l.borrowed_on "NGÀY MƯỢN",l.due_on "HẠN TRẢ",l.delivery_method "HÌNH THỨC NHẬN",count(i.id) "SỐ CUỐN",count(i.id) filter(where i.resolution_status='OPEN') "CHƯA TRẢ",coalesce(sum(i.deposit_required_vnd),0) "CỌC PHẢI THU (đ)",
coalesce((select sum(d.amount_vnd) from library.deposit_entries d join library.loan_items x on x.id=d.loan_item_id where x.loan_id=l.id and d.purpose='COLLECT'),0) "CỌC ĐÃ THU (đ)",coalesce(sum(b.held),0) "CỌC CÒN GIỮ (đ)",string_agg(distinct w.display_name,', ') "VÍ NHẬN CỌC",l.status "TRẠNG THÁI PHIẾU",l.created_by "NGƯỜI LẬP PHIẾU",l.notes "GHI CHÚ"
from library.loans l join library.readers r on r.id=l.reader_id left join library.loan_items i on i.loan_id=l.id left join library.deposit_balances b on b.loan_item_id=i.id left join library.wallets w on w.id=i.deposit_wallet_id group by l.id,r.code;
create view library.excel_chi_tiet_phieu with(security_invoker=true) as
select l.code "MÃ PHIẾU",c.code "MÃ SÁCH",i.title_snapshot->>'title' "TÊN ĐẦU SÁCH",(i.title_snapshot->>'cover_price_vnd')::bigint "GIÁ BÌA (đ)",i.deposit_required_vnd "CỌC DỰ KIẾN (đ)",r.code "MÃ ĐỌC GIẢ",l.borrowed_on "NGÀY MƯỢN",i.due_on "HẠN TRẢ",i.returned_on "NGÀY TRẢ THỰC TẾ",i.condition_out_note "TÌNH TRẠNG KHI MƯỢN",ri.outcome "KẾT QUẢ KHI TRẢ",
greatest(0,coalesce(i.returned_on,i.loss_confirmed_on,(now() at time zone 'Asia/Ho_Chi_Minh')::date)-i.due_on) "SỐ NGÀY TRỄ",
greatest(0,coalesce(i.returned_on,i.loss_confirmed_on,(now() at time zone 'Asia/Ho_Chi_Minh')::date)-i.due_on)*p.late_fee_vnd_per_day "PHẠT TRỄ (đ)",
coalesce((select sum(ch.amount_vnd) from library.charges ch where ch.loan_item_id=i.id and ch.type<>'LATE_FEE'),0) "PHẠT HƯ / MẤT (đ)",i.resolution_status "TRẠNG THÁI",i.condition_out_note "GHI CHÚ"
from library.loan_items i join library.loans l on l.id=i.loan_id join library.policy_versions p on p.id=l.policy_version_id join library.readers r on r.id=l.reader_id join library.book_copies c on c.id=i.copy_id left join library.return_items ri on ri.loan_item_id=i.id;
create view library.excel_hoat_dong with(security_invoker=true) as
select t.code "MÃ GIAO DỊCH",extract(day from t.occurred_at at time zone 'Asia/Ho_Chi_Minh') "NGÀY",extract(month from t.occurred_at at time zone 'Asia/Ho_Chi_Minh') "THÁNG",extract(year from t.occurred_at at time zone 'Asia/Ho_Chi_Minh') "NĂM",r.code "MÃ ĐỌC GIẢ",l.code "MÃ PHIẾU MƯỢN",t.type "LOẠI HOẠT ĐỘNG",t.amount_vnd "SỐ TIỀN",
(select string_agg(distinct w.display_name,', ') from library.cash_entries e join library.wallets w on w.id=e.wallet_id where e.transaction_id=t.id) "HÌNH THỨC",t.created_by "NGƯỜI XỬ LÝ",t.reason "GHI CHÚ",t.transfer_reference "MÃ THAM CHIẾU CK",
coalesce((select sum(case when d.direction='INCREASE' then d.amount_vnd else -d.amount_vnd end) from library.deposit_entries d where d.transaction_id=t.id),0) "ẢNH HƯỞNG QUỸ CỌC",
coalesce((select sum(case when e.direction='IN' then e.amount_vnd else -e.amount_vnd end) from library.cash_entries e where e.transaction_id=t.id),0) "TIỀN VÀO/RA VÍ",t.occurred_at "NGÀY ĐẦY ĐỦ"
from library.financial_transactions t left join library.readers r on r.id=t.reader_id left join library.loans l on l.id=t.loan_id;
create view library.excel_vi_thanh_toan with(security_invoker=true) as
select w.code "MÃ VÍ",w.display_name "TÊN HIỂN THỊ",w.type "LOẠI",w.account_holder "CHỦ TÀI KHOẢN",w.account_number "SỐ TÀI KHOẢN / SĐT",w.bank_name "NGÂN HÀNG",w.qr_url "LINK ẢNH QR",w.active "TRẠNG THÁI",w.opening_balance_vnd "SỐ DƯ ĐẦU KỲ (đ)",
w.opening_balance_vnd+coalesce((select sum(case when e.direction='IN' then e.amount_vnd else -e.amount_vnd end) from library.cash_entries e where e.wallet_id=w.id),0) "SỐ DƯ HIỆN TẠI (đ)",
coalesce((select sum(b.held) from library.deposit_balances b join library.loan_items i on i.id=b.loan_item_id where i.deposit_wallet_id=w.id),0) "CỌC ĐANG GIỮ TẠI ĐÂY (đ)",w.notes "GHI CHÚ" from library.wallets w;
revoke all on all tables in schema library from public;
commit;


-- 005_admin_sessions.sql
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


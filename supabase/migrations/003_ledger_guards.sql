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

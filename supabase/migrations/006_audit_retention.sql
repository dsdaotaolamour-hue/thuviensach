begin;
create or replace function library.guard_audit_history() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op = 'DELETE' and old.occurred_at <= now() - interval '15 days' then
    return old;
  end if;
  raise exception 'APPEND_ONLY: history cannot be modified';
end $$;
revoke all on function library.guard_audit_history() from public;
drop trigger immutable_history on library.audit_logs;
create trigger immutable_history before update or delete on library.audit_logs
for each row execute function library.guard_audit_history();
commit;

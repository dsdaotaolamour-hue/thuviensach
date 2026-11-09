-- Run after migrations/006_audit_retention.sql on Supabase.
create extension if not exists pg_cron;
select cron.schedule(
  'lamour-audit-retention',
  '15 * * * *',
  $$delete from library.audit_logs where occurred_at <= now() - interval '15 days'$$
);

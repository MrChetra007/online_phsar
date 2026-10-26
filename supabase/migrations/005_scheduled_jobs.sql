-- ---------------------------------------------------------------------
-- 005_scheduled_jobs.sql
-- Enable pg_cron / pg_net and schedule the maintenance jobs plus notify.
--
-- pg_cron schedules below are UTC.
--
-- Before the notify job can send, create two Vault secrets once:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<legacy service_role JWT>', 'notify_service_role_key');
--
-- The notify secret must be the legacy service_role JWT, because the
-- notify Edge Function verifies the JWT role. Never put it in git or the
-- frontend. The job skips safely until both secrets exist.
-- ---------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_notify() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_project_url text;
  v_service_key text;
begin
  select decrypted_secret into v_project_url
    from vault.decrypted_secrets
   where name = 'project_url'
     and nullif(trim(decrypted_secret), '') is not null
   order by updated_at desc nulls last
   limit 1;

  select decrypted_secret into v_service_key
    from vault.decrypted_secrets
   where name = 'notify_service_role_key'
     and nullif(trim(decrypted_secret), '') is not null
   order by updated_at desc nulls last
   limit 1;

  v_project_url := nullif(trim(v_project_url), '');
  v_service_key := nullif(trim(v_service_key), '');

  if v_project_url is null or v_service_key is null then
    raise notice 'notify skipped: create Vault secrets project_url and notify_service_role_key';
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'apikey', v_service_key
    ),
    body := jsonb_build_object('limit', 20),
    timeout_milliseconds := 15000
  );
end $$;

revoke all on function public.invoke_notify() from public, anon, authenticated;
grant execute on function public.invoke_notify() to service_role;

do $$
declare r record;
begin
  for r in
    select jobid from cron.job
     where jobname in (
       'expire-unpaid-orders',
       'complete-due-orders',
       'shipping-reminders',
       'cleanup',
       'telegram-notify'
     )
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule('expire-unpaid-orders', '* * * * *',
  $$select public.expire_unpaid_orders()$$);
select cron.schedule('complete-due-orders', '0 * * * *',
  $$select public.complete_due_orders()$$);
select cron.schedule('shipping-reminders', '*/30 * * * *',
  $$select public.enqueue_shipping_reminders()$$);
select cron.schedule('cleanup', '30 3 * * *',
  $$select public.cleanup_rate_limits()$$);
select cron.schedule('telegram-notify', '* * * * *',
  $$select public.invoke_notify()$$);

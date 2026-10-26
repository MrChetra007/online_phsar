create or replace function public.get_store_commission_percent()
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_percent numeric;
begin
  if not exists (
    select 1 from public.stores where owner_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce((value #>> '{}')::numeric, 30)
  into v_percent
  from public.platform_settings
  where key = 'commission_percent';

  return coalesce(v_percent, 30);
end;
$$;

revoke all on function public.get_store_commission_percent()
  from public, anon, authenticated;
grant execute on function public.get_store_commission_percent()
  to authenticated;

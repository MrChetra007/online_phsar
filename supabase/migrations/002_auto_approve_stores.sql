alter table public.stores alter column status set default 'active';

drop policy if exists stores_owner_insert on public.stores;

create policy stores_owner_insert on public.stores
  for insert to authenticated
  with check (owner_id = auth.uid() and status = 'active');

update public.stores set status = 'active' where status = 'pending';

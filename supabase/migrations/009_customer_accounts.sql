-- ---------------------------------------------------------------------
-- 009_customer_accounts.sql
-- Shopper accounts: default role, order history, and favorites.
-- ---------------------------------------------------------------------

-- New accounts are shoppers by default; sellers opt in at signup.
alter table profiles alter column role set default 'customer';

-- Orders placed while signed in belong to the shopper account.
-- Added without a default first so existing rows stay unlinked.
alter table orders
  add column customer_id uuid references profiles(id) on delete set null;
alter table orders alter column customer_id set default auth.uid();
create index orders_customer_created_idx
  on orders(customer_id, created_at desc)
  where customer_id is not null;

-- One row per shopper/product favorite.
create table customer_favorites (
  customer_id uuid not null default auth.uid()
    references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);
create index customer_favorites_product_idx on customer_favorites(product_id);

alter table customer_favorites enable row level security;

create policy customer_favorites_select on customer_favorites
  for select to authenticated
  using (customer_id = auth.uid());

create policy customer_favorites_insert on customer_favorites
  for insert to authenticated
  with check (customer_id = auth.uid());

create policy customer_favorites_delete on customer_favorites
  for delete to authenticated
  using (customer_id = auth.uid());

revoke all on customer_favorites from public, anon, authenticated;
grant select, insert, delete on customer_favorites to authenticated;

-- Only store owners may open a store. Shoppers need a seller account.
drop policy if exists stores_owner_insert on stores;
create policy stores_owner_insert on stores
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'store_owner'
    )
  );

-- New auth user -> profile. Only customer/store_owner are allowed here;
-- privileged roles must never come from client metadata.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role user_role := 'customer';
begin
  if lower(coalesce(new.raw_user_meta_data ->> 'account_type', '')) in
     ('store_owner', 'seller', 'store') then
    v_role := 'store_owner';
  end if;

  insert into profiles (id, role, full_name, phone)
  values (
    new.id, v_role,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Shopper order history. Security definer so RLS cannot hide the rows;
-- the WHERE clause is the only source of identity.
create function list_my_orders()
returns table (
  id uuid,
  order_code text,
  status order_status,
  payment_method payment_method,
  payment_status payment_status,
  total_amount int,
  store_name text,
  store_slug text,
  item_count int,
  created_at timestamptz
)
language sql security definer set search_path = public, pg_temp stable as $$
  select
    o.id,
    o.order_code,
    o.status,
    o.payment_method,
    o.payment_status,
    coalesce(o.total_amount, 0)::int,
    s.name,
    s.slug,
    coalesce(sum(oi.quantity), 0)::int,
    o.created_at
  from orders o
  join stores s on s.id = o.store_id
  left join order_items oi on oi.order_id = o.id
  where o.customer_id = auth.uid()
  group by o.id, s.name, s.slug
  order by o.created_at desc
  limit 100;
$$;

create function get_my_order(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp stable as $$
declare
  o orders%rowtype;
  v_items jsonb;
  v_hist jsonb;
  v_store record;
  v_window int := coalesce(_setting_numeric('return_window_days', 3), 3)::int;
begin
  select * into o from orders
   where id = p_order_id and customer_id = auth.uid();
  if not found then return null; end if;

  select name, slug into v_store from stores where id = o.store_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', name_snapshot, 'variant', variant_label_snapshot,
           'unit_price', unit_price, 'quantity', quantity) order by name_snapshot), '[]')
    into v_items from order_items where order_id = o.id;

  select coalesce(jsonb_agg(jsonb_build_object('status', new_status, 'at', created_at)
           order by created_at), '[]')
    into v_hist from order_status_history
   where order_id = o.id and old_status is distinct from new_status;

  return jsonb_build_object(
    'order_id', o.id,
    'order_code', o.order_code,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'store_name', v_store.name,
    'store_slug', v_store.slug,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'address', o.address,
    'province', o.province,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total_amount', o.total_amount,
    'courier_name', o.courier_name,
    'tracking_note', o.tracking_note,
    'created_at', o.created_at,
    'delivered_at', o.delivered_at,
    'items', v_items,
    'history', v_hist,
    'qr_string', case when o.payment_method = 'khqr' and o.payment_status = 'unpaid'
                        and o.status = 'pending' and o.qr_expires_at > now()
                      then o.qr_string end,
    'qr_expires_at', case when o.payment_method = 'khqr' and o.payment_status = 'unpaid'
                            and o.status = 'pending' then o.qr_expires_at end,
    'can_cancel', o.status in ('pending', 'confirmed'),
    'can_reopen', o.status = 'cancelled' and o.payment_status = 'expired' and o.stock_released,
    'can_confirm_received', o.status = 'shipped',
    'can_report_problem', o.status = 'delivered' and not o.has_open_dispute
                          and o.delivered_at > now() - make_interval(days => v_window)
  );
end $$;

revoke all on function list_my_orders(), get_my_order(uuid)
  from public, anon, authenticated;
grant execute on function list_my_orders(), get_my_order(uuid)
  to authenticated;

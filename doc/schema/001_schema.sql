-- =====================================================================
-- 001_schema.sql  |  Local Dropshipping Platform (project plan v1.2)
-- Target: Supabase (Postgres 15+). Put in supabase/migrations/.
--
-- CONVENTIONS
--  * All money is INTEGER USD cents. Never floats.
--  * Customers are guests: they never touch tables. They call the
--    anon-callable functions (create_order, track_order, ...).
--  * Business rules live in functions. RLS only controls who can SEE.
--    Almost all writes to orders / ledger / settlements are function-only.
--  * Ledger sign convention: ledger_entries.amount is the effect on the
--    STORE BALANCE when affects_balance = true.
--      positive = platform owes the store more
--      negative = the store owes the platform more
--    Informational rows (affects_balance = false) record facts only.
--  * Function errors are raised as short codes (the message), e.g.
--    SOLD_OUT, RATE_LIMITED. The frontend maps them to Khmer/English text.
--
-- FIRST SUPER ADMIN (run once in the SQL editor after you sign up):
--    update profiles set role = 'super_admin' where id = '<your auth user id>';
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Default privileges: nothing is public unless granted explicitly
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
create type user_role as enum ('super_admin', 'store_owner');
create type store_status as enum ('pending', 'active', 'suspended');
create type product_status as enum ('draft', 'active', 'hidden');
create type order_source as enum ('platform', 'store_link');
create type order_status as enum (
  'pending', 'confirmed', 'rejected', 'cancelled', 'shipped',
  'delivered', 'completed', 'paid_out', 'refused', 'returned', 'refunded'
);
create type payment_method as enum ('khqr', 'cod');
create type payment_status as enum (
  'unpaid', 'paid', 'flagged', 'expired', 'refund_due', 'refunded'
);
create type ledger_type as enum (
  'customer_payment', 'cod_collected_by_store', 'commission',
  'delivery_fee_passthrough', 'store_payable', 'commission_receivable',
  'commission_settled', 'payout_paid', 'refund', 'deduction'
);
create type settlement_direction as enum ('platform_pays', 'store_pays');
create type notification_status as enum ('pending', 'sent', 'failed');


-- ---------------------------------------------------------------------
-- 2. Pure helper functions (no table access)
-- ---------------------------------------------------------------------
create function _set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Cambodian phone normalisation: "+855 12 345 678" -> "012345678"
create function _normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  if d like '855%' then d := substr(d, 4); end if;
  if d = '' then return ''; end if;
  if left(d, 1) <> '0' then d := '0' || d; end if;
  return d;
end $$;

-- Random, non-sequential order code, e.g. DS-3F9A1C07B2
create function _generate_order_code() returns text
language sql volatile as $$
  select 'DS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- Which status moves are allowed, by actor. 'paid_out' is never allowed here:
-- only create_settlement() can set it.
create function _transition_allowed(
  p_old order_status, p_new order_status, p_admin boolean, p_store boolean
) returns boolean
language sql immutable as $$
  select case
    when p_old = 'pending'   and p_new in ('confirmed', 'rejected') then (p_admin or p_store)
    when p_old = 'pending'   and p_new = 'cancelled'                then p_admin
    when p_old = 'confirmed' and p_new in ('shipped', 'rejected')   then (p_admin or p_store)
    when p_old = 'confirmed' and p_new = 'cancelled'                then p_admin
    when p_old = 'shipped'   and p_new in ('delivered', 'refused')  then (p_admin or p_store)
    when p_old = 'refused'   and p_new = 'returned'                 then (p_admin or p_store)
    when p_old = 'delivered' and p_new = 'returned'                 then (p_admin or p_store)
    when p_old = 'delivered' and p_new in ('completed', 'refunded') then p_admin
    when p_old = 'returned'  and p_new = 'refunded'                 then p_admin
    else false
  end;
$$;

-- Best-effort client IP from PostgREST headers (null if unavailable)
create function _request_ip() returns text
language plpgsql stable as $$
begin
  return nullif(trim(split_part(
    coalesce((current_setting('request.headers', true)::jsonb) ->> 'x-forwarded-for', ''),
    ',', 1)), '');
exception when others then
  return null;
end $$;


-- ---------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------

-- 3.1 profiles ------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'store_owner',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.2 stores (public-safe columns only) -----------------------------
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  description text check (char_length(description) <= 1000),
  logo_url text,
  province text,
  status store_status not null default 'pending',
  delivery_fee_local int not null default 0 check (delivery_fee_local >= 0),
  delivery_fee_other int not null default 0 check (delivery_fee_other >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stores_owner_idx on stores(owner_id);

-- 3.3 store_private (never public: phone, Telegram, bank) ----------
create table store_private (
  store_id uuid primary key references stores(id) on delete cascade,
  contact_phone text,
  telegram_chat_id bigint,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  updated_at timestamptz not null default now()
);

-- 3.4 categories ----------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name_km text not null,
  name_en text not null,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  requires_size boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3.5 platform_settings ---------------------------------------------
create table platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 3.6 products / variants / images ----------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 150),
  description text check (char_length(description) <= 4000),
  status product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_store_idx on products(store_id, status);
create index products_category_idx on products(category_id) where status = 'active';

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null default 'Default' check (char_length(trim(label)) between 1 and 60),
  price int not null check (price > 0),                 -- USD cents
  stock int not null default 0 check (stock >= 0),
  sku text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, label)
);
create index variants_product_idx on product_variants(product_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on product_images(product_id, sort_order);

-- 3.7 orders --------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default _generate_order_code(),
  store_id uuid not null references stores(id) on delete restrict,
  source order_source not null default 'platform',

  customer_name text not null check (char_length(trim(customer_name)) between 1 and 100),
  customer_phone text not null check (char_length(customer_phone) between 6 and 30),
  customer_phone_norm text generated always as (_normalize_phone(customer_phone)) stored,
  address text not null check (char_length(trim(address)) between 1 and 500),
  province text not null check (char_length(trim(province)) between 1 and 100),

  payment_method payment_method not null,
  payment_status payment_status not null default 'unpaid',
  payment_reference text,
  qr_string text,
  qr_expires_at timestamptz,
  paid_at timestamptz,

  status order_status not null default 'pending',

  subtotal int not null default 0 check (subtotal >= 0),
  delivery_fee int not null default 0 check (delivery_fee >= 0),
  total_amount int generated always as (subtotal + delivery_fee) stored,
  commission_percent numeric(5,2) not null check (commission_percent between 0 and 100),
  commission_amount int not null default 0 check (commission_amount >= 0),
  store_payout_amount int not null default 0 check (store_payout_amount >= 0),

  courier_name text,
  tracking_note text,

  has_open_dispute boolean not null default false,
  problem_note text,
  problem_reported_at timestamptz,
  customer_confirmed_at timestamptz,

  stock_released boolean not null default false,        -- stock already returned to variants

  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_store_status_idx on orders(store_id, status);
create index orders_status_created_idx on orders(status, created_at desc);
create index orders_phone_idx on orders(customer_phone_norm);
create index orders_qr_expiry_idx on orders(qr_expires_at)
  where payment_method = 'khqr' and payment_status = 'unpaid' and status = 'pending';
-- One bank transaction can pay only one order
create unique index orders_payment_reference_uniq on orders(payment_reference)
  where payment_reference is not null;

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  name_snapshot text not null,
  variant_label_snapshot text,
  unit_price int not null check (unit_price > 0),
  quantity int not null check (quantity > 0)
);
create index order_items_order_idx on order_items(order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  old_status order_status,
  new_status order_status not null,
  changed_by uuid,                                      -- null = system / customer
  note text,
  created_at timestamptz not null default now()
);
create index order_history_order_idx on order_status_history(order_id, created_at);

-- 3.8 stock_movements (audit of every stock change) -----------------
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  delta int not null,
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on stock_movements(variant_id, created_at desc);

-- 3.9 ledger (append-only) ------------------------------------------
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete restrict,
  store_id uuid not null references stores(id) on delete restrict,
  type ledger_type not null,
  amount bigint not null check (amount <> 0),
  affects_balance boolean not null default false,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index ledger_store_idx on ledger_entries(store_id, created_at);
create index ledger_order_idx on ledger_entries(order_id);

-- 3.10 settlements --------------------------------------------------
create table settlements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete restrict,
  period_label text not null,
  net_amount bigint not null default 0,                 -- always >= 0; see direction
  direction settlement_direction not null default 'platform_pays',
  reference text,                                       -- bank transfer reference
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index settlements_store_idx on settlements(store_id, created_at desc);

create table settlement_orders (
  settlement_id uuid not null references settlements(id) on delete cascade,
  order_id uuid not null unique references orders(id) on delete restrict,
  primary key (settlement_id, order_id)
);

-- 3.11 payment webhook deduplication --------------------------------
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null default '{}',
  result text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- 3.12 notifications queue (Edge Function sends and marks sent) -----
-- Only ids are queued; the sender loads details with the service role,
-- so customer phone numbers never sit in this table.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  target text not null check (target in ('store', 'admin')),
  channel text not null default 'telegram',
  order_id uuid references orders(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  payload jsonb not null default '{}',
  status notification_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_pending_idx on notifications(created_at) where status = 'pending';
create index notifications_order_event_idx on notifications(order_id, event);

-- 3.13 telegram_link_codes ------------------------------------------
create table telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3.14 rate limiting -------------------------------------------------
create table rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_key_idx on rate_limit_hits(key, created_at);


-- ---------------------------------------------------------------------
-- 4. Helper functions that read tables
-- ---------------------------------------------------------------------
create function is_super_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$;

create function owns_store(p_store_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from stores where id = p_store_id and owner_id = auth.uid());
$$;

-- owner of a store that is not suspended (may edit products)
create function store_can_edit(p_store_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from stores
    where id = p_store_id and owner_id = auth.uid() and status <> 'suspended'
  );
$$;

create function owns_product(p_product_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from products p join stores s on s.id = p.store_id
    where p.id = p_product_id and s.owner_id = auth.uid()
  );
$$;

create function can_edit_product(p_product_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from products p join stores s on s.id = p.store_id
    where p.id = p_product_id and s.owner_id = auth.uid() and s.status <> 'suspended'
  );
$$;

-- Orders a store owner may see: COD orders, or KHQR orders that are paid
create function store_can_see_order(p_order_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from orders o join stores s on s.id = o.store_id
    where o.id = p_order_id and s.owner_id = auth.uid()
      and (o.payment_method = 'cod' or o.payment_status in ('paid', 'refund_due', 'refunded'))
  );
$$;

-- Settings readers (value is jsonb; these return typed values with defaults)
create function _setting_numeric(p_key text, p_default numeric default null) returns numeric
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select (value #>> '{}')::numeric from platform_settings
      where key = p_key and jsonb_typeof(value) = 'number'),
    p_default);
$$;

create function _setting_bool(p_key text, p_default boolean default false) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select (value #>> '{}')::boolean from platform_settings
      where key = p_key and jsonb_typeof(value) = 'boolean'),
    p_default);
$$;

create function _setting_text(p_key text, p_default text default null) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select value #>> '{}' from platform_settings
      where key = p_key and jsonb_typeof(value) = 'string'),
    p_default);
$$;

-- Records a hit and raises RATE_LIMITED when over the limit.
-- (If the caller's transaction later fails, the hit rolls back with it.)
create function _check_rate_limit(p_key text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  insert into rate_limit_hits(key) values (p_key);
  select count(*) into n from rate_limit_hits
   where key = p_key and created_at > now() - p_window;
  if n > p_max then
    raise exception 'RATE_LIMITED';
  end if;
end $$;

create function _enqueue_notification(
  p_event text, p_target text, p_order_id uuid, p_store_id uuid, p_payload jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into notifications(event, target, order_id, store_id, payload)
  values (p_event, p_target, p_order_id, p_store_id, coalesce(p_payload, '{}'));
end $$;

-- Storage helper: object path must start with "<store_id>/"
create function _storage_owner_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_first text := split_part(p_name, '/', 1);
begin
  if v_first !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return store_can_edit(v_first::uuid);
end $$;


-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------
create trigger profiles_updated before update on profiles
  for each row execute function _set_updated_at();
create trigger stores_updated before update on stores
  for each row execute function _set_updated_at();
create trigger store_private_updated before update on store_private
  for each row execute function _set_updated_at();
create trigger products_updated before update on products
  for each row execute function _set_updated_at();
create trigger orders_updated before update on orders
  for each row execute function _set_updated_at();
create trigger settings_updated before update on platform_settings
  for each row execute function _set_updated_at();

-- New auth user -> profile. Role is ALWAYS store_owner (never from client metadata).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles (id, role, full_name, phone)
  values (
    new.id, 'store_owner',
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- New store -> private row
create function _create_store_private() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into store_private (store_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger stores_create_private after insert on stores
  for each row execute function _create_store_private();

-- Every stock change is logged. Order functions set app.stock_reason /
-- app.stock_order_id (transaction-local) first; manual edits log "manual_adjust".
create function _log_stock_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.stock is distinct from old.stock then
    insert into stock_movements (variant_id, order_id, delta, reason, created_by)
    values (
      new.id,
      nullif(current_setting('app.stock_order_id', true), '')::uuid,
      new.stock - old.stock,
      coalesce(nullif(current_setting('app.stock_reason', true), ''), 'manual_adjust'),
      auth.uid()
    );
  end if;
  return new;
end $$;
create trigger variants_stock_log after update of stock on product_variants
  for each row execute function _log_stock_change();

-- Ledger and status history are append-only
create function _append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'APPEND_ONLY: % on % is not allowed', tg_op, tg_table_name;
end $$;
create trigger ledger_no_update before update or delete on ledger_entries
  for each row execute function _append_only();
create trigger history_no_update before update or delete on order_status_history
  for each row execute function _append_only();

-- Basic validation for settings the business logic depends on
create function _validate_setting() returns trigger
language plpgsql as $$
begin
  if new.key = 'commission_percent' then
    if jsonb_typeof(new.value) <> 'number'
       or (new.value #>> '{}')::numeric not between 0 and 100 then
      raise exception 'INVALID_SETTING: commission_percent must be a number from 0 to 100';
    end if;
  elsif new.key in ('payout_hold_days', 'return_window_days', 'store_ship_deadline_hours') then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric < 0 then
      raise exception 'INVALID_SETTING: % must be a number >= 0', new.key;
    end if;
  elsif new.key = 'unpaid_qr_expiry_minutes' then
    if jsonb_typeof(new.value) <> 'number' or (new.value #>> '{}')::numeric < 1 then
      raise exception 'INVALID_SETTING: unpaid_qr_expiry_minutes must be >= 1';
    end if;
  elsif new.key in ('cod_enabled', 'maintenance_mode') then
    if jsonb_typeof(new.value) <> 'boolean' then
      raise exception 'INVALID_SETTING: % must be true or false', new.key;
    end if;
  end if;
  return new;
end $$;
create trigger settings_validate before insert or update on platform_settings
  for each row execute function _validate_setting();

-- Queue Telegram notifications from order changes (ids only)
create function _orders_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_store_sees boolean;
begin
  if tg_op = 'INSERT' then
    perform _enqueue_notification('new_order', 'admin', new.id, new.store_id);
    if new.payment_method = 'cod' then
      perform _enqueue_notification('new_order', 'store', new.id, new.store_id);
    end if;
    return new;
  end if;

  v_store_sees := new.payment_method = 'cod'
    or new.payment_status in ('paid', 'refund_due', 'refunded');

  -- KHQR confirmed: only now does the store hear about it
  if new.payment_method = 'khqr' and old.payment_status <> 'paid' and new.payment_status = 'paid' then
    perform _enqueue_notification('new_order', 'store', new.id, new.store_id);
  end if;
  if old.payment_status <> 'flagged' and new.payment_status = 'flagged' then
    perform _enqueue_notification('payment_flagged', 'admin', new.id, new.store_id);
  end if;

  if new.status <> old.status then
    if new.status in ('cancelled', 'refused', 'returned') and v_store_sees then
      perform _enqueue_notification('order_' || new.status::text, 'store', new.id, new.store_id);
    end if;
    if new.status = 'refused' then
      perform _enqueue_notification('failed_delivery', 'admin', new.id, new.store_id);
    end if;
  end if;

  if not old.has_open_dispute and new.has_open_dispute then
    perform _enqueue_notification('customer_problem', 'admin', new.id, new.store_id);
    if v_store_sees then
      perform _enqueue_notification('customer_problem', 'store', new.id, new.store_id);
    end if;
  end if;
  return new;
end $$;
create trigger orders_notify after insert or update of status, payment_status, has_open_dispute on orders
  for each row execute function _orders_notify();


-- ---------------------------------------------------------------------
-- 6. Stock and status internals (not callable by clients)
-- ---------------------------------------------------------------------

-- Atomic reservation: one guarded UPDATE. Two buyers can never take the last item.
create function _reserve_variant(
  p_variant_id uuid, p_store_id uuid, p_qty int,
  out unit_price int, out variant_label text, out product_name text
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update product_variants v set stock = v.stock - p_qty
  from products p
  where v.id = p_variant_id
    and p.id = v.product_id
    and p.store_id = p_store_id
    and p.status = 'active'
    and v.is_active
    and v.stock >= p_qty
  returning v.price, v.label, p.name
  into unit_price, variant_label, product_name;

  if not found then
    raise exception 'SOLD_OUT' using detail = p_variant_id::text;
  end if;
end $$;

-- Return an order's stock once (guarded by orders.stock_released)
create function _return_stock(p_order_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_done boolean;
begin
  update orders set stock_released = true
   where id = p_order_id and stock_released = false
  returning true into v_done;
  if v_done is null then return; end if;

  perform set_config('app.stock_reason', p_reason, true);
  perform set_config('app.stock_order_id', p_order_id::text, true);
  update product_variants v set stock = v.stock + t.qty
  from (
    select variant_id, sum(quantity)::int as qty
    from order_items
    where order_id = p_order_id and variant_id is not null
    group by variant_id
  ) t
  where v.id = t.variant_id;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order_id', '', true);
end $$;

-- The single place where order status changes. Writes history, ledger, stock.
create function _change_order_status(
  p_order_id uuid, p_new_status order_status, p_actor uuid, p_note text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status = p_new_status then return; end if;

  update orders set
    status = p_new_status,
    confirmed_at = case when p_new_status = 'confirmed' then now() else confirmed_at end,
    shipped_at   = case when p_new_status = 'shipped'   then now() else shipped_at end,
    delivered_at = case when p_new_status = 'delivered' then now() else delivered_at end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end,
    payment_status = case
      when p_new_status in ('cancelled', 'rejected')
           and payment_status = 'paid' and payment_method = 'khqr'
        then 'refund_due'::payment_status
      when p_new_status = 'delivered' and payment_method = 'cod'
           and payment_status in ('unpaid', 'flagged')
        then 'paid'::payment_status
      when p_new_status = 'refunded' and payment_status in ('paid', 'refund_due')
        then 'refunded'::payment_status
      else payment_status
    end,
    paid_at = case
      when p_new_status = 'delivered' and payment_method = 'cod' and paid_at is null
        then now() else paid_at end
  where id = p_order_id;

  -- COD: delivery confirms the store collected the cash
  if p_new_status = 'delivered' and o.payment_method = 'cod'
     and o.payment_status in ('unpaid', 'flagged') then
    insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
    values (o.id, o.store_id, 'cod_collected_by_store', o.total_amount, false,
            'COD cash collected by store', p_actor);
  end if;

  if p_new_status = 'refunded' and o.payment_status in ('paid', 'refund_due') then
    insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
    values (o.id, o.store_id, 'refund', o.total_amount, false, 'Order refunded', p_actor);
  end if;

  if p_new_status in ('cancelled', 'rejected') then
    perform _return_stock(o.id, 'order_released');
  end if;

  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, p_new_status, p_actor, p_note);
end $$;

-- Internal: mark a KHQR order paid and write the ledger row
create function _mark_order_paid(p_order_id uuid, p_reference text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  update orders set payment_status = 'paid', paid_at = now(), payment_reference = p_reference
   where id = p_order_id;
  insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note)
  values (o.id, o.store_id, 'customer_payment', o.total_amount, false, 'KHQR payment ' || coalesce(p_reference, ''));
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, o.status, null, 'Payment confirmed: ' || coalesce(p_reference, ''));
end $$;


-- ---------------------------------------------------------------------
-- 7. Customer-facing functions (anon + authenticated)
-- ---------------------------------------------------------------------

-- p_items: [{"variant_id": "<uuid>", "quantity": 2}, ...]
-- Prices, delivery fee and commission come from the database, never the client.
create function create_order(
  p_store_id uuid, p_items jsonb,
  p_customer_name text, p_customer_phone text,
  p_address text, p_province text,
  p_payment_method payment_method,
  p_source order_source default 'platform'
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_store stores%rowtype;
  v_phone text;
  v_ip text;
  v_pct numeric;
  v_order_id uuid := gen_random_uuid();
  v_code text;
  v_fee int;
  v_subtotal int := 0;
  v_commission int;
  v_expires timestamptz;
  r record;
  li record;
begin
  if _setting_bool('maintenance_mode', false) then raise exception 'MAINTENANCE'; end if;
  if p_payment_method = 'cod' and not _setting_bool('cod_enabled', true) then
    raise exception 'COD_DISABLED';
  end if;

  select * into v_store from stores where id = p_store_id and status = 'active';
  if not found then raise exception 'STORE_UNAVAILABLE'; end if;

  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_address), '') = ''
     or coalesce(trim(p_province), '') = '' then
    raise exception 'INVALID_CUSTOMER';
  end if;
  v_phone := _normalize_phone(p_customer_phone);
  if char_length(v_phone) not between 8 and 11 then raise exception 'INVALID_PHONE'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'INVALID_ITEMS';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or (e ->> 'variant_id') is null
       or (e ->> 'variant_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(e ->> 'quantity', '') !~ '^[0-9]{1,2}$'
  ) then
    raise exception 'INVALID_ITEMS';
  end if;

  perform _check_rate_limit('order:phone:' || v_phone, 5, interval '1 hour');
  v_ip := _request_ip();
  if v_ip is not null then
    perform _check_rate_limit('order:ip:' || v_ip, 20, interval '1 hour');
  end if;

  v_pct := coalesce(_setting_numeric('commission_percent', 30), 30);
  v_fee := case
    when lower(trim(p_province)) = lower(trim(_setting_text('local_delivery_province', 'Battambang')))
      then v_store.delivery_fee_local
    else v_store.delivery_fee_other
  end;
  if p_payment_method = 'khqr' then
    v_expires := now() + make_interval(mins => coalesce(_setting_numeric('unpaid_qr_expiry_minutes', 30), 30)::int);
  end if;

  -- Order row first (stock movements reference it); amounts filled in below
  insert into orders (
    id, store_id, source, customer_name, customer_phone, address, province,
    payment_method, commission_percent, delivery_fee, qr_expires_at
  ) values (
    v_order_id, p_store_id, p_source, trim(p_customer_name), trim(p_customer_phone),
    trim(p_address), trim(p_province), p_payment_method, v_pct, v_fee, v_expires
  ) returning order_code into v_code;

  perform set_config('app.stock_reason', 'order_placed', true);
  perform set_config('app.stock_order_id', v_order_id::text, true);

  -- Sorted by variant id so concurrent orders lock rows in the same order (no deadlocks)
  for r in
    select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1 order by 1
  loop
    if r.qty < 1 or r.qty > 99 then raise exception 'INVALID_ITEMS'; end if;
    select * into li from _reserve_variant(r.variant_id, p_store_id, r.qty);
    insert into order_items(order_id, variant_id, name_snapshot, variant_label_snapshot, unit_price, quantity)
    values (v_order_id, r.variant_id, li.product_name, li.variant_label, li.unit_price, r.qty);
    v_subtotal := v_subtotal + li.unit_price * r.qty;
  end loop;

  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order_id', '', true);

  v_commission := round(v_subtotal::numeric * v_pct / 100.0)::int;
  update orders set
    subtotal = v_subtotal,
    commission_amount = v_commission,
    store_payout_amount = v_subtotal - v_commission + v_fee
  where id = v_order_id;

  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (v_order_id, null, 'pending', null, 'Order placed');

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_code,
    'payment_method', p_payment_method,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total_amount', v_subtotal + v_fee,
    'qr_expires_at', v_expires
  );
end $$;

-- Returns a safe subset, or NULL (never says whether the code or the phone was wrong)
create function track_order(p_order_code text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o orders%rowtype;
  v_norm text := _normalize_phone(p_phone);
  v_ip text;
  v_items jsonb;
  v_hist jsonb;
  v_store text;
  v_window int := coalesce(_setting_numeric('return_window_days', 3), 3)::int;
begin
  perform _check_rate_limit('track:phone:' || v_norm, 10, interval '10 minutes');
  v_ip := _request_ip();
  if v_ip is not null then
    perform _check_rate_limit('track:ip:' || v_ip, 30, interval '10 minutes');
  end if;

  select * into o from orders
   where order_code = upper(trim(p_order_code)) and customer_phone_norm = v_norm;
  if not found then return null; end if;

  select name into v_store from stores where id = o.store_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', name_snapshot, 'variant', variant_label_snapshot,
           'unit_price', unit_price, 'quantity', quantity) order by name_snapshot), '[]')
    into v_items from order_items where order_id = o.id;
  select coalesce(jsonb_agg(jsonb_build_object('status', new_status, 'at', created_at)
           order by created_at), '[]')
    into v_hist from order_status_history where order_id = o.id and old_status is distinct from new_status;

  return jsonb_build_object(
    'order_code', o.order_code,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'store_name', v_store,
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
    -- QR shown only while it can still be paid
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

create function customer_cancel_order(p_order_code text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  perform _check_rate_limit('track:phone:' || _normalize_phone(p_phone), 10, interval '10 minutes');
  select * into o from orders
   where order_code = upper(trim(p_order_code)) and customer_phone_norm = _normalize_phone(p_phone)
   for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status not in ('pending', 'confirmed') then raise exception 'CANNOT_CANCEL'; end if;
  perform _change_order_status(o.id, 'cancelled', null, 'Cancelled by customer');
  return jsonb_build_object('ok', true);
end $$;

-- Shipped -> delivered (customer says it arrived), or just records confirmation
create function customer_confirm_received(p_order_code text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  perform _check_rate_limit('track:phone:' || _normalize_phone(p_phone), 10, interval '10 minutes');
  select * into o from orders
   where order_code = upper(trim(p_order_code)) and customer_phone_norm = _normalize_phone(p_phone)
   for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = 'shipped' then
    perform _change_order_status(o.id, 'delivered', null, 'Customer confirmed received');
    update orders set customer_confirmed_at = now() where id = o.id;
  elsif o.status = 'delivered' then
    update orders set customer_confirmed_at = coalesce(customer_confirmed_at, now()) where id = o.id;
  else
    raise exception 'INVALID_STATE';
  end if;
  return jsonb_build_object('ok', true);
end $$;

create function report_problem(p_order_code text, p_phone text, p_note text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o orders%rowtype;
  v_window int := coalesce(_setting_numeric('return_window_days', 3), 3)::int;
begin
  perform _check_rate_limit('track:phone:' || _normalize_phone(p_phone), 10, interval '10 minutes');
  if char_length(trim(coalesce(p_note, ''))) not between 3 and 1000 then
    raise exception 'INVALID_NOTE';
  end if;
  select * into o from orders
   where order_code = upper(trim(p_order_code)) and customer_phone_norm = _normalize_phone(p_phone)
   for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status <> 'delivered' or o.delivered_at <= now() - make_interval(days => v_window) then
    raise exception 'RETURN_WINDOW_CLOSED';
  end if;
  update orders set has_open_dispute = true, problem_note = trim(p_note),
                    problem_reported_at = now()
   where id = o.id;
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, o.status, null, 'Customer reported a problem');
  return jsonb_build_object('ok', true);
end $$;

-- Expired KHQR order: re-reserve stock (fails with SOLD_OUT if gone) and reopen.
-- The Edge Function then calls generate_khqr and set_order_qr.
create function reopen_expired_order(p_order_code text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o orders%rowtype;
  r record;
  v_expires timestamptz;
begin
  perform _check_rate_limit('track:phone:' || _normalize_phone(p_phone), 10, interval '10 minutes');
  if _setting_bool('maintenance_mode', false) then raise exception 'MAINTENANCE'; end if;
  select * into o from orders
   where order_code = upper(trim(p_order_code)) and customer_phone_norm = _normalize_phone(p_phone)
   for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not (o.status = 'cancelled' and o.payment_status = 'expired' and o.stock_released) then
    raise exception 'INVALID_STATE';
  end if;
  if not exists (select 1 from stores where id = o.store_id and status = 'active') then
    raise exception 'STORE_UNAVAILABLE';
  end if;

  perform set_config('app.stock_reason', 'order_reopened', true);
  perform set_config('app.stock_order_id', o.id::text, true);
  for r in
    select variant_id, sum(quantity)::int as qty from order_items
    where order_id = o.id group by variant_id order by variant_id
  loop
    if r.variant_id is null then raise exception 'SOLD_OUT'; end if;
    perform _reserve_variant(r.variant_id, o.store_id, r.qty);
  end loop;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order_id', '', true);

  v_expires := now() + make_interval(mins => coalesce(_setting_numeric('unpaid_qr_expiry_minutes', 30), 30)::int);
  update orders set status = 'pending', payment_status = 'unpaid', stock_released = false,
                    qr_string = null, qr_expires_at = v_expires
   where id = o.id;
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, 'cancelled', 'pending', null, 'Reopened after QR expiry');

  return jsonb_build_object('order_id', o.id, 'order_code', o.order_code,
                            'total_amount', o.total_amount, 'qr_expires_at', v_expires);
end $$;


-- ---------------------------------------------------------------------
-- 8. Store owner + admin functions (authenticated)
-- ---------------------------------------------------------------------

-- Store owner (own orders) or super admin. Admin must give a note when
-- acting on a store's order.
create function set_order_status(
  p_order_id uuid, p_new_status order_status, p_note text default null,
  p_courier_name text default null, p_tracking_note text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o orders%rowtype;
  v_admin boolean := is_super_admin();
  v_store boolean;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  v_store := owns_store(o.store_id);
  if not (v_admin or v_store) then raise exception 'FORBIDDEN'; end if;
  if not _transition_allowed(o.status, p_new_status, v_admin, v_store) then
    raise exception 'INVALID_TRANSITION' using detail = o.status::text || ' -> ' || p_new_status::text;
  end if;
  if v_admin and not v_store and coalesce(trim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED';
  end if;
  -- An unpaid KHQR order is not the store's yet
  if o.status = 'pending' and p_new_status in ('confirmed', 'rejected')
     and o.payment_method = 'khqr' and o.payment_status <> 'paid' then
    raise exception 'PAYMENT_NOT_CONFIRMED';
  end if;

  if p_new_status = 'shipped' then
    update orders set courier_name = coalesce(nullif(trim(p_courier_name), ''), courier_name),
                      tracking_note = coalesce(nullif(trim(p_tracking_note), ''), tracking_note)
     where id = o.id;
  end if;
  perform _change_order_status(o.id, p_new_status, auth.uid(), p_note);
end $$;

-- Put returned items back into stock (once). Store owner or admin.
create function restock_order(p_order_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if not (is_super_admin() or owns_store(o.store_id)) then raise exception 'FORBIDDEN'; end if;
  if o.status not in ('returned', 'refunded') then raise exception 'INVALID_STATE'; end if;
  if o.stock_released then raise exception 'ALREADY_RESTOCKED'; end if;
  perform _return_stock(o.id, 'return_restock');
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, o.status, auth.uid(), coalesce(p_note, 'Returned items restocked'));
end $$;

create function create_telegram_link_code(p_store_id uuid) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_code text;
begin
  if not owns_store(p_store_id) then raise exception 'FORBIDDEN'; end if;
  delete from telegram_link_codes where store_id = p_store_id and used_at is null;
  v_code := substr(upper(replace(gen_random_uuid()::text, '-', '')), 1, 8);
  insert into telegram_link_codes(store_id, code, expires_at)
  values (p_store_id, v_code, now() + interval '15 minutes');
  return v_code;
end $$;

create function get_store_balance(p_store_id uuid) returns bigint
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (is_super_admin() or owns_store(p_store_id)) then raise exception 'FORBIDDEN'; end if;
  return coalesce((select sum(amount) from ledger_entries
                    where store_id = p_store_id and affects_balance), 0);
end $$;

-- ---- admin only ----------------------------------------------------
create function set_store_status(p_store_id uuid, p_status store_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  update stores set status = p_status where id = p_store_id;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Fallback when automatic KHQR verification fails (e.g. from a proof screenshot)
create function confirm_payment_manually(p_order_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'NOTE_REQUIRED'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_method <> 'khqr' or o.status <> 'pending'
     or o.payment_status not in ('unpaid', 'flagged', 'expired') then
    raise exception 'INVALID_STATE';
  end if;
  perform _mark_order_paid(o.id, 'manual:' || left(replace(gen_random_uuid()::text, '-', ''), 12));
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, o.status, auth.uid(), 'Manual payment confirmation: ' || trim(p_note));
end $$;

-- Money was sent back to the customer (cancelled/rejected after payment, or flagged payment)
create function mark_payment_refunded(p_order_id uuid, p_reference text, p_note text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_status not in ('refund_due', 'flagged') then raise exception 'INVALID_STATE'; end if;
  update orders set payment_status = 'refunded' where id = o.id;
  insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
  values (o.id, o.store_id, 'refund', greatest(o.total_amount, 1), false,
          'Refund sent. Ref: ' || coalesce(p_reference, '-'), auth.uid());
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, o.status, auth.uid(), coalesce(p_note, 'Payment refunded to customer'));
end $$;

create function resolve_dispute(p_order_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'NOTE_REQUIRED'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  update orders set has_open_dispute = false where id = o.id;
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, o.status, o.status, auth.uid(), 'Dispute resolved: ' || trim(p_note));
end $$;

-- Charge a store (refund at fault, late shipment penalty, ...)
create function record_deduction(p_store_id uuid, p_order_id uuid, p_amount int, p_note text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'NOTE_REQUIRED'; end if;
  insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
  values (p_order_id, p_store_id, 'deduction', -p_amount, true, trim(p_note), auth.uid());
end $$;

-- A store transferred money it owed the platform (COD commission)
create function record_commission_settled(
  p_store_id uuid, p_amount int, p_reference text, p_note text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if coalesce(trim(p_reference), '') = '' then raise exception 'REFERENCE_REQUIRED'; end if;
  insert into ledger_entries(store_id, type, amount, affects_balance, note, created_by)
  values (p_store_id, 'commission_settled', p_amount, true,
          'Transfer from store. Ref: ' || trim(p_reference) || coalesce(' - ' || p_note, ''), auth.uid());
end $$;

-- Weekly settlement overview: eligible orders, balance, estimated net per store
create function get_settlement_summary()
returns table (
  store_id uuid, store_name text, eligible_orders int,
  khqr_payable bigint, cod_commission_owed bigint,
  current_balance bigint, estimated_net bigint
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare v_hold int := coalesce(_setting_numeric('payout_hold_days', 3), 3)::int;
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  return query
  with elig as (
    select o.* from orders o
    where o.status in ('delivered', 'completed')
      and o.payment_status = 'paid'
      and not o.has_open_dispute
      and o.delivered_at is not null
      and o.delivered_at <= now() - make_interval(days => v_hold)
      and not exists (select 1 from settlement_orders so where so.order_id = o.id)
  ),
  agg as (
    select e.store_id,
           count(*)::int as n,
           coalesce(sum(case when e.payment_method = 'khqr' then e.store_payout_amount else 0 end), 0)::bigint as khqr,
           coalesce(sum(case when e.payment_method = 'cod'  then e.commission_amount   else 0 end), 0)::bigint as cod
    from elig e group by e.store_id
  ),
  bal as (
    select l.store_id, sum(l.amount)::bigint as b
    from ledger_entries l where l.affects_balance group by l.store_id
  )
  select s.id, s.name, coalesce(a.n, 0), coalesce(a.khqr, 0), coalesce(a.cod, 0),
         coalesce(b.b, 0), coalesce(b.b, 0) + coalesce(a.khqr, 0) - coalesce(a.cod, 0)
  from stores s
  left join agg a on a.store_id = s.id
  left join bal b on b.store_id = s.id
  where a.n is not null or coalesce(b.b, 0) <> 0
  order by s.name;
end $$;

-- Runs one store's settlement for the chosen eligible orders.
--  * KHQR order: store_payable  (+ item subtotal - commission + delivery fee)
--  * COD order:  commission_receivable (- commission the store owes)
-- New balance > 0: admin pays the store (reference required) and a payout_paid row is written.
-- New balance <= 0: nothing is paid; the debt carries forward (direction = store_pays).
create function create_settlement(
  p_store_id uuid, p_order_ids uuid[], p_reference text default null, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o orders%rowtype;
  v_hold int := coalesce(_setting_numeric('payout_hold_days', 3), 3)::int;
  v_sid uuid := gen_random_uuid();
  v_count int := 0;
  v_balance bigint;
  v_ids uuid[] := coalesce(p_order_ids, '{}');
begin
  if not is_super_admin() then raise exception 'FORBIDDEN'; end if;
  perform 1 from stores where id = p_store_id for update;      -- one settlement per store at a time
  if not found then raise exception 'NOT_FOUND'; end if;

  insert into settlements(id, store_id, period_label, note, created_by)
  values (v_sid, p_store_id, to_char(now(), 'IYYY-"W"IW'), p_note, auth.uid());

  for o in select * from orders where id = any(v_ids) order by id for update loop
    if o.store_id <> p_store_id
       or o.status not in ('delivered', 'completed')
       or o.payment_status <> 'paid'
       or o.has_open_dispute
       or o.delivered_at is null
       or o.delivered_at > now() - make_interval(days => v_hold)
       or exists (select 1 from settlement_orders so where so.order_id = o.id) then
      raise exception 'ORDER_NOT_ELIGIBLE' using detail = o.order_code;
    end if;

    -- informational rows
    insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
    values (o.id, o.store_id, 'commission', greatest(o.commission_amount, 1), false,
            'Commission ' || o.commission_percent || '%', auth.uid());
    if o.delivery_fee > 0 then
      insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
      values (o.id, o.store_id, 'delivery_fee_passthrough', o.delivery_fee, false, 'Delivery fee to store', auth.uid());
    end if;
    -- balance rows
    if o.payment_method = 'khqr' then
      insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
      values (o.id, o.store_id, 'store_payable', o.store_payout_amount, true, 'KHQR order payable to store', auth.uid());
    elsif o.commission_amount > 0 then
      insert into ledger_entries(order_id, store_id, type, amount, affects_balance, note, created_by)
      values (o.id, o.store_id, 'commission_receivable', -o.commission_amount, true, 'COD commission owed by store', auth.uid());
    end if;

    insert into settlement_orders(settlement_id, order_id) values (v_sid, o.id);
    perform _change_order_status(o.id, 'paid_out', auth.uid(), 'Included in settlement');
    v_count := v_count + 1;
  end loop;

  if v_count <> coalesce(array_length(v_ids, 1), 0) then
    raise exception 'ORDER_NOT_FOUND_OR_DUPLICATE';
  end if;

  select coalesce(sum(amount), 0) into v_balance from ledger_entries
   where store_id = p_store_id and affects_balance;

  if v_count = 0 and v_balance = 0 then raise exception 'NOTHING_TO_SETTLE'; end if;

  if v_balance > 0 then
    if coalesce(trim(p_reference), '') = '' then raise exception 'REFERENCE_REQUIRED'; end if;
    insert into ledger_entries(store_id, type, amount, affects_balance, note, created_by)
    values (p_store_id, 'payout_paid', -v_balance, true, 'Payout. Ref: ' || trim(p_reference), auth.uid());
    update settlements set direction = 'platform_pays', net_amount = v_balance, reference = trim(p_reference)
     where id = v_sid;
    perform _enqueue_notification('payout_sent', 'store', null, p_store_id,
                                  jsonb_build_object('settlement_id', v_sid, 'amount', v_balance));
  else
    update settlements set direction = 'store_pays', net_amount = -v_balance,
                           reference = nullif(trim(coalesce(p_reference, '')), '')
     where id = v_sid;
  end if;

  return jsonb_build_object('settlement_id', v_sid, 'orders', v_count,
                            'direction', case when v_balance > 0 then 'platform_pays' else 'store_pays' end,
                            'net_amount', abs(v_balance));
end $$;


-- ---------------------------------------------------------------------
-- 9. Service-role functions (Edge Functions and scheduled jobs only)
-- ---------------------------------------------------------------------

-- Edge Function stores the QR it generated
create function set_order_qr(p_order_id uuid, p_qr_string text, p_expires_at timestamptz)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update orders set qr_string = p_qr_string, qr_expires_at = p_expires_at
   where id = p_order_id and payment_method = 'khqr' and status = 'pending' and payment_status = 'unpaid';
  if not found then raise exception 'INVALID_STATE'; end if;
end $$;

-- Webhook dedup: returns TRUE the first time an event id is seen, FALSE for repeats
create function claim_webhook_event(p_provider text, p_event_id text, p_payload jsonb default '{}')
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  insert into webhook_events(provider, event_id, payload)
  values (p_provider, p_event_id, coalesce(p_payload, '{}'))
  on conflict (provider, event_id) do nothing
  returning id into v_id;
  return v_id is not null;
end $$;

create function finish_webhook_event(p_provider text, p_event_id text, p_result text) returns void
language sql security definer set search_path = public, pg_temp as $$
  update webhook_events set result = p_result, processed_at = now()
   where provider = p_provider and event_id = p_event_id;
$$;

-- Called by khqr_webhook / verify_khqr_payment after the provider's authenticity check.
-- p_amount is in USD CENTS (convert KHR first). Returns:
--   paid | already_paid | flagged_amount | flagged_late | flagged_duplicate_reference | ignored
create function mark_order_paid(
  p_order_id uuid, p_reference text, p_amount int
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_method <> 'khqr' then return 'ignored'; end if;
  if o.payment_status = 'paid' then return 'already_paid'; end if;

  -- This bank transaction already paid a different order: never reuse it
  if p_reference is not null and exists (
       select 1 from orders where payment_reference = p_reference and id <> o.id) then
    update orders set payment_status = 'flagged' where id = o.id and payment_status <> 'flagged';
    insert into order_status_history(order_id, old_status, new_status, changed_by, note)
    values (o.id, o.status, o.status, null,
            'Payment reference already used by another order: needs admin');
    return 'flagged_duplicate_reference';
  end if;

  -- Paid after the order was cancelled/expired: needs admin (refund or reopen)
  if o.status <> 'pending' then
    update orders set payment_status = 'flagged', payment_reference = coalesce(p_reference, payment_reference)
     where id = o.id;
    insert into order_status_history(order_id, old_status, new_status, changed_by, note)
    values (o.id, o.status, o.status, null, 'Payment received after order was ' || o.status || ': needs admin');
    return 'flagged_late';
  end if;

  if p_amount is distinct from o.total_amount then
    update orders set payment_status = 'flagged', payment_reference = coalesce(p_reference, payment_reference)
     where id = o.id;
    insert into order_status_history(order_id, old_status, new_status, changed_by, note)
    values (o.id, o.status, o.status, null,
            'Wrong payment amount: got ' || coalesce(p_amount::text, 'null') || ', expected ' || o.total_amount);
    return 'flagged_amount';
  end if;

  perform _mark_order_paid(o.id, p_reference);
  return 'paid';
end $$;

-- Cancels unpaid KHQR orders past their expiry and releases stock. Run every minute.
create function expire_unpaid_orders() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; n int := 0;
begin
  for r in
    select id from orders
    where payment_method = 'khqr' and payment_status = 'unpaid' and status = 'pending'
      and qr_expires_at is not null and qr_expires_at < now()
    order by qr_expires_at
    for update skip locked
  loop
    perform _change_order_status(r.id, 'cancelled', null, 'KHQR payment expired');
    update orders set payment_status = 'expired' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- delivered -> completed once the return window has passed with no dispute. Run hourly.
create function complete_due_orders() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record; n int := 0;
  v_window int := coalesce(_setting_numeric('return_window_days', 3), 3)::int;
begin
  for r in
    select id from orders
    where status = 'delivered' and not has_open_dispute
      and delivered_at <= now() - make_interval(days => v_window)
    for update skip locked
  loop
    perform _change_order_status(r.id, 'completed', null, 'Return window passed');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Store reminder after 24h unshipped; admin alert after the ship deadline. Run every 30 min.
create function enqueue_shipping_reminders() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record; n int := 0;
  v_deadline numeric := coalesce(_setting_numeric('store_ship_deadline_hours', 48), 48);
begin
  for r in
    select id, store_id from orders
    where status = 'confirmed' and confirmed_at < now() - interval '24 hours'
      and not exists (select 1 from notifications x where x.order_id = orders.id and x.event = 'ship_reminder')
  loop
    perform _enqueue_notification('ship_reminder', 'store', r.id, r.store_id);
    n := n + 1;
  end loop;
  for r in
    select id, store_id from orders
    where status = 'confirmed' and confirmed_at < now() - make_interval(hours => v_deadline::int)
      and not exists (select 1 from notifications x where x.order_id = orders.id and x.event = 'late_shipment')
  loop
    perform _enqueue_notification('late_shipment', 'admin', r.id, r.store_id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Telegram bot: store sent its one-time code. Returns the store name or NULL.
create function link_telegram_chat(p_code text, p_chat_id bigint) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare c telegram_link_codes%rowtype; v_name text;
begin
  select * into c from telegram_link_codes
   where code = upper(trim(p_code)) and used_at is null and expires_at > now()
   for update;
  if not found then return null; end if;
  update telegram_link_codes set used_at = now() where id = c.id;
  update store_private set telegram_chat_id = p_chat_id where store_id = c.store_id;
  select name into v_name from stores where id = c.store_id;
  return v_name;
end $$;

create function cleanup_rate_limits() returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from rate_limit_hits where created_at < now() - interval '1 day';
  delete from telegram_link_codes where expires_at < now() - interval '1 day';
$$;


-- ---------------------------------------------------------------------
-- 10. Row Level Security (who can SEE what)
-- ---------------------------------------------------------------------
alter table profiles            enable row level security;
alter table stores              enable row level security;
alter table store_private       enable row level security;
alter table categories          enable row level security;
alter table platform_settings   enable row level security;
alter table products            enable row level security;
alter table product_variants    enable row level security;
alter table product_images      enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_status_history enable row level security;
alter table stock_movements     enable row level security;
alter table ledger_entries      enable row level security;
alter table settlements         enable row level security;
alter table settlement_orders   enable row level security;
alter table webhook_events      enable row level security;   -- no policies: service role only
alter table notifications       enable row level security;
alter table telegram_link_codes enable row level security;   -- no policies: functions only
alter table rate_limit_hits     enable row level security;   -- no policies: functions only

-- profiles
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_super_admin());
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- stores
create policy stores_public_read on stores for select to anon, authenticated
  using (status = 'active');
create policy stores_owner_read on stores for select to authenticated
  using (owner_id = auth.uid());
create policy stores_admin_read on stores for select to authenticated
  using (is_super_admin());
create policy stores_owner_insert on stores for insert to authenticated
  with check (owner_id = auth.uid() and status = 'pending');
create policy stores_owner_update on stores for update to authenticated
  using (owner_id = auth.uid() and status <> 'suspended')
  with check (owner_id = auth.uid());

-- store_private
create policy store_private_owner_read on store_private for select to authenticated
  using (owns_store(store_id) or is_super_admin());
create policy store_private_owner_update on store_private for update to authenticated
  using (owns_store(store_id)) with check (owns_store(store_id));

-- categories
create policy categories_public_read on categories for select to anon, authenticated
  using (is_active);
create policy categories_admin_all on categories for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- platform_settings
create policy settings_public_read on platform_settings for select to anon, authenticated
  using (is_public);
create policy settings_admin_all on platform_settings for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- products
create policy products_public_read on products for select to anon, authenticated
  using (status = 'active' and exists (select 1 from stores s where s.id = store_id and s.status = 'active'));
create policy products_owner_read on products for select to authenticated
  using (owns_store(store_id));
create policy products_admin_read on products for select to authenticated
  using (is_super_admin());
create policy products_owner_insert on products for insert to authenticated
  with check (store_can_edit(store_id));
create policy products_owner_update on products for update to authenticated
  using (store_can_edit(store_id)) with check (store_can_edit(store_id));
create policy products_owner_delete on products for delete to authenticated
  using (store_can_edit(store_id));

-- product_variants
create policy variants_public_read on product_variants for select to anon, authenticated
  using (is_active and exists (
    select 1 from products p join stores s on s.id = p.store_id
    where p.id = product_id and p.status = 'active' and s.status = 'active'));
create policy variants_owner_read on product_variants for select to authenticated
  using (owns_product(product_id) or is_super_admin());
create policy variants_owner_insert on product_variants for insert to authenticated
  with check (can_edit_product(product_id));
create policy variants_owner_update on product_variants for update to authenticated
  using (can_edit_product(product_id)) with check (can_edit_product(product_id));
create policy variants_owner_delete on product_variants for delete to authenticated
  using (can_edit_product(product_id));

-- product_images
create policy images_public_read on product_images for select to anon, authenticated
  using (exists (
    select 1 from products p join stores s on s.id = p.store_id
    where p.id = product_id and p.status = 'active' and s.status = 'active'));
create policy images_owner_read on product_images for select to authenticated
  using (owns_product(product_id) or is_super_admin());
create policy images_owner_insert on product_images for insert to authenticated
  with check (can_edit_product(product_id));
create policy images_owner_update on product_images for update to authenticated
  using (can_edit_product(product_id)) with check (can_edit_product(product_id));
create policy images_owner_delete on product_images for delete to authenticated
  using (can_edit_product(product_id));

-- orders and children: store owner sees own (COD, or KHQR once paid); admin sees all. No direct writes.
create policy orders_read on orders for select to authenticated
  using (is_super_admin() or (owns_store(store_id)
         and (payment_method = 'cod' or payment_status in ('paid', 'refund_due', 'refunded'))));
create policy order_items_read on order_items for select to authenticated
  using (is_super_admin() or store_can_see_order(order_id));
create policy order_history_read on order_status_history for select to authenticated
  using (is_super_admin() or store_can_see_order(order_id));

-- stock movements
create policy stock_movements_read on stock_movements for select to authenticated
  using (is_super_admin() or owns_product((select v.product_id from product_variants v where v.id = variant_id)));

-- money
create policy ledger_read on ledger_entries for select to authenticated
  using (is_super_admin() or owns_store(store_id));
create policy settlements_read on settlements for select to authenticated
  using (is_super_admin() or owns_store(store_id));
create policy settlement_orders_read on settlement_orders for select to authenticated
  using (is_super_admin() or exists (
    select 1 from settlements s where s.id = settlement_id and owns_store(s.store_id)));

-- notifications: admin can inspect the queue
create policy notifications_admin_read on notifications for select to authenticated
  using (is_super_admin());


-- ---------------------------------------------------------------------
-- 11. Grants
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Public catalog (RLS limits rows)
grant select on categories, platform_settings, stores, products, product_variants, product_images
  to anon, authenticated;

-- Signed-in users (RLS limits rows)
grant select on profiles, store_private, orders, order_items, order_status_history,
  stock_movements, ledger_entries, settlements, settlement_orders, notifications
  to authenticated;

-- Writes: only the columns a client may change
grant update (full_name, phone) on profiles to authenticated;
grant insert (owner_id, name, slug, description, logo_url, province, delivery_fee_local, delivery_fee_other)
  on stores to authenticated;
grant update (name, description, logo_url, province, delivery_fee_local, delivery_fee_other)
  on stores to authenticated;
grant update (contact_phone, bank_name, bank_account_name, bank_account_number)
  on store_private to authenticated;
grant insert, update, delete on categories to authenticated;               -- admin only via RLS
grant update (value, description, is_public) on platform_settings to authenticated;  -- admin only via RLS
grant insert (store_id, category_id, name, description, status) on products to authenticated;
grant update (category_id, name, description, status) on products to authenticated;
grant delete on products to authenticated;
grant insert (product_id, label, price, stock, sku, is_active) on product_variants to authenticated;
grant update (label, price, stock, sku, is_active) on product_variants to authenticated;
grant delete on product_variants to authenticated;
grant insert (product_id, url, sort_order) on product_images to authenticated;
grant update (url, sort_order) on product_images to authenticated;
grant delete on product_images to authenticated;

-- Policy helpers must be callable by the roles that evaluate policies
grant execute on function is_super_admin(), owns_store(uuid), store_can_edit(uuid),
  owns_product(uuid), can_edit_product(uuid), store_can_see_order(uuid)
  to anon, authenticated;

-- Customers (guests) and signed-in users
grant execute on function
  create_order(uuid, jsonb, text, text, text, text, payment_method, order_source),
  track_order(text, text),
  customer_cancel_order(text, text),
  customer_confirm_received(text, text),
  report_problem(text, text, text),
  reopen_expired_order(text, text)
  to anon, authenticated;

-- Store owners and admin (permission checked inside each function)
grant execute on function
  set_order_status(uuid, order_status, text, text, text),
  restock_order(uuid, text),
  create_telegram_link_code(uuid),
  get_store_balance(uuid),
  set_store_status(uuid, store_status, text),
  confirm_payment_manually(uuid, text),
  mark_payment_refunded(uuid, text, text),
  resolve_dispute(uuid, text),
  record_deduction(uuid, uuid, int, text),
  record_commission_settled(uuid, int, text, text),
  get_settlement_summary(),
  create_settlement(uuid, uuid[], text, text)
  to authenticated;

-- Edge Functions and scheduled jobs (service_role bypasses RLS but needs explicit execute)
grant execute on function
  set_order_qr(uuid, text, timestamptz),
  claim_webhook_event(text, text, jsonb),
  finish_webhook_event(text, text, text),
  mark_order_paid(uuid, text, int),
  expire_unpaid_orders(),
  complete_due_orders(),
  enqueue_shipping_reminders(),
  link_telegram_chat(text, bigint),
  cleanup_rate_limits()
  to service_role;


-- ---------------------------------------------------------------------
-- 12. Storage: product images (Supabase Storage)
-- Path convention: <store_id>/<product_id>/<file>
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-images', 'product-images', true, 5242880,
            array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;

    execute $p$create policy "product images: owner upload" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'product-images' and public._storage_owner_ok(name))$p$;
    execute $p$create policy "product images: owner update" on storage.objects
      for update to authenticated
      using (bucket_id = 'product-images' and public._storage_owner_ok(name))$p$;
    execute $p$create policy "product images: owner delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'product-images' and public._storage_owner_ok(name))$p$;
    grant execute on function public._storage_owner_ok(text) to authenticated;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 13. Seed data
-- ---------------------------------------------------------------------
insert into platform_settings (key, value, description, is_public) values
  ('commission_percent',        '30',           'Flat commission on every order item subtotal', false),
  ('payout_hold_days',          '3',            'Days after delivery before an order is included in settlement', false),
  ('return_window_days',        '3',            'Days a customer can report a problem', false),
  ('store_ship_deadline_hours', '48',           'Expected hours from confirmation to shipped', false),
  ('unpaid_qr_expiry_minutes',  '30',           'Minutes an unpaid KHQR order holds stock (decision pending)', false),
  ('local_delivery_province',   '"Battambang"', 'Province that uses the store local delivery fee', false),
  ('cod_enabled',               'true',         'Allow cash on delivery', true),
  ('shop_name',                 '""',           'Public shop name', true),
  ('shop_contact_phone',        '""',           'Shown to customers', true),
  ('admin_telegram_chat_id',    '""',           'Receives admin alerts', false),
  ('maintenance_mode',          'false',        'Pauses checkout', true);

insert into categories (name_km, name_en, slug, sort_order, requires_size) values
  ('សម្លៀកបំពាក់', 'Clothes', 'clothes', 1, true);


-- ---------------------------------------------------------------------
-- 14. Scheduled jobs (enable pg_cron in Supabase, then uncomment)
-- ---------------------------------------------------------------------
-- select cron.schedule('expire-unpaid-orders',  '* * * * *',    $$select public.expire_unpaid_orders()$$);
-- select cron.schedule('complete-due-orders',   '0 * * * *',    $$select public.complete_due_orders()$$);
-- select cron.schedule('shipping-reminders',    '*/30 * * * *', $$select public.enqueue_shipping_reminders()$$);
-- select cron.schedule('cleanup',               '30 3 * * *',   $$select public.cleanup_rate_limits()$$);

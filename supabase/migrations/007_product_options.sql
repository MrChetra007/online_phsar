-- ---------------------------------------------------------------------
-- 007_product_options.sql
-- Add structured product options (size/color) with option groups and values.
-- Keeps existing product_variants.label for backwards compatibility.
-- ---------------------------------------------------------------------

-- Option groups per product (e.g. Size, Color)
create table if not exists product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name_km text,
  name_en text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name_en)
);

create index if not exists product_option_groups_product_idx on product_option_groups(product_id);

-- Option values per group (e.g. S, M, L / Red, Blue)
create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references product_option_groups(id) on delete cascade,
  value_km text,
  value_en text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, value_en)
);

create index if not exists product_options_group_idx on product_options(group_id);

-- Link variants to selected option values
create table if not exists product_variant_options (
  variant_id uuid not null references product_variants(id) on delete cascade,
  option_id uuid not null references product_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (variant_id, option_id)
);

create index if not exists product_variant_options_option_idx on product_variant_options(option_id);
create index if not exists product_variant_options_variant_idx on product_variant_options(variant_id);

-- Triggers for updated_at
create trigger product_option_groups_updated
  before update on product_option_groups
  for each row execute function public._set_updated_at();

create trigger product_options_updated
  before update on product_options
  for each row execute function public._set_updated_at();

-- RLS
alter table product_option_groups enable row level security;
alter table product_options enable row level security;
alter table product_variant_options enable row level security;

-- Public read access (for storefront)
create policy product_option_groups_public_read
  on product_option_groups
  for select
  to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active'));

create policy product_options_public_read
  on product_options
  for select
  to anon, authenticated
  using (exists (
    select 1
    from product_option_groups g
    join products p on p.id = g.product_id
    where g.id = group_id and p.status = 'active'
  ));

create policy product_variant_options_public_read
  on product_variant_options
  for select
  to anon, authenticated
  using (exists (
    select 1
    from product_variants v
    join products p on p.id = v.product_id
    where v.id = variant_id and p.status = 'active' and v.is_active = true
  ));

-- Store owner access (own products)
create policy product_option_groups_owner_all
  on product_option_groups
  for all
  to authenticated
  using (owns_product(product_id))
  with check (owns_product(product_id));

create policy product_options_owner_all
  on product_options
  for all
  to authenticated
  using (exists (
    select 1
    from product_option_groups g
    where g.id = group_id and owns_product(g.product_id)
  ))
  with check (exists (
    select 1
    from product_option_groups g
    where g.id = group_id and owns_product(g.product_id)
  ));

create policy product_variant_options_owner_all
  on product_variant_options
  for all
  to authenticated
  using (exists (
    select 1
    from product_variants v
    where v.id = variant_id and owns_product(v.product_id)
  ))
  with check (exists (
    select 1
    from product_variants v
    where v.id = variant_id and owns_product(v.product_id)
  ));

-- Super admin access
create policy product_option_groups_admin_all
  on product_option_groups
  for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

create policy product_options_admin_all
  on product_options
  for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

create policy product_variant_options_admin_all
  on product_variant_options
  for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- Grants
grant select on product_option_groups, product_options, product_variant_options to anon, authenticated;
grant insert, update, delete on product_option_groups, product_options, product_variant_options to authenticated;

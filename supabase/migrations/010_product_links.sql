-- =====================================================================
-- 010_product_links.sql
-- Optional original/supplier product link for dropshipping.
--
-- Kept in a separate table, not on `products`, because the products table
-- is publicly readable with the anon key. This link is private: only the
-- owning store and the super admin can read it.
-- =====================================================================

create table if not exists product_links (
  product_id uuid primary key references products(id) on delete cascade,
  product_link text not null check (char_length(trim(product_link)) between 4 and 2000),
  updated_at timestamptz not null default now()
);

create trigger product_links_updated before update on product_links
  for each row execute function _set_updated_at();

alter table product_links enable row level security;

create policy product_links_owner_read on product_links for select to authenticated
  using (owns_product(product_id) or is_super_admin());

create policy product_links_owner_insert on product_links for insert to authenticated
  with check (can_edit_product(product_id));

create policy product_links_owner_update on product_links for update to authenticated
  using (can_edit_product(product_id)) with check (can_edit_product(product_id));

create policy product_links_owner_delete on product_links for delete to authenticated
  using (can_edit_product(product_id));

revoke all on product_links from public, anon, authenticated;
grant select, insert, update, delete on product_links to authenticated;

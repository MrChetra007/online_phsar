-- =====================================================================
-- 006_store_social_links.sql
-- Adds public social contact links to each store (facebook, telegram).
-- These columns are in `stores` (public table) so they can be shown
-- to any visitor on the Public Store page without exposing private data.
-- =====================================================================

alter table stores
  add column if not exists facebook_url    text,
  add column if not exists telegram_username text;

-- Mark shop_contact_phone as public so anonymous clients can read it
-- (used by the /contact page). Update or insert.
insert into platform_settings (key, value, description, is_public)
values
  ('shop_contact_phone',  '""', 'Platform support phone number shown on /contact page', true),
  ('shop_facebook_url',   '""', 'Platform Facebook page URL shown on /contact page', true),
  ('shop_telegram_username', '""', 'Platform Telegram username shown on /contact page', true)
on conflict (key) do update
  set is_public = true,
      description = excluded.description;

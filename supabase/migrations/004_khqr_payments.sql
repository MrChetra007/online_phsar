alter table orders
  add column if not exists khqr_md5 text,
  add column if not exists khqr_tran_id text,
  add column if not exists khqr_checkout_url text;

create unique index if not exists orders_khqr_md5_uniq
  on orders(khqr_md5)
  where khqr_md5 is not null;

create or replace function set_order_khqr(
  p_order_id uuid,
  p_qr_string text,
  p_khqr_md5 text,
  p_khqr_tran_id text,
  p_khqr_checkout_url text,
  p_expires_at timestamptz
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update orders set
    qr_string = p_qr_string,
    khqr_md5 = p_khqr_md5,
    khqr_tran_id = p_khqr_tran_id,
    khqr_checkout_url = p_khqr_checkout_url,
    qr_expires_at = p_expires_at
  where id = p_order_id
    and payment_method = 'khqr'
    and status = 'pending'
    and payment_status = 'unpaid';

  if not found then raise exception 'INVALID_STATE'; end if;
end $$;

revoke execute on function set_order_khqr(uuid, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function set_order_khqr(uuid, text, text, text, text, timestamptz)
  to service_role;

create or replace function reopen_expired_order(p_order_code text, p_phone text) returns jsonb
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
                    qr_string = null, qr_expires_at = v_expires,
                    khqr_md5 = null, khqr_tran_id = null, khqr_checkout_url = null
   where id = o.id;
  insert into order_status_history(order_id, old_status, new_status, changed_by, note)
  values (o.id, 'cancelled', 'pending', null, 'Reopened after QR expiry');

  return jsonb_build_object('order_id', o.id, 'order_code', o.order_code,
                            'total_amount', o.total_amount, 'qr_expires_at', v_expires);
end $$;

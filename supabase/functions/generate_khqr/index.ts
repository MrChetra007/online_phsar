import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  amountForProvider,
  corsHeaders,
  isRecord,
  isUuid,
  jsonResponse,
  khrPerUsd,
  providerBaseUrl,
  providerCurrency,
  providerData,
  qrImageUrl,
} from '../_shared/khqr.ts'

const qrLifetimeMs = 10 * 60 * 1000

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'NOT_CONFIGURED' }, 500)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST' }, 400)
  }

  if (!isRecord(body) || !isUuid(body.order_id)) {
    return jsonResponse({ error: 'INVALID_REQUEST' }, 400)
  }

  const service = createClient(supabaseUrl, serviceKey)
  const { data: order, error: orderError } = await service
    .from('orders')
    .select(
      'id, order_code, total_amount, payment_method, payment_status, status, qr_string, qr_expires_at, khqr_md5, khqr_checkout_url',
    )
    .eq('id', body.order_id)
    .maybeSingle()

  if (orderError) {
    console.error('Could not load order', orderError.message)
    return jsonResponse({ error: 'DATABASE_ERROR' }, 500)
  }
  if (!order) return jsonResponse({ error: 'ORDER_NOT_FOUND' }, 404)
  if (order.payment_method !== 'khqr') {
    return jsonResponse({ error: 'INVALID_PAYMENT_METHOD' }, 400)
  }
  if (order.status !== 'pending' || order.payment_status !== 'unpaid') {
    return jsonResponse({ error: 'INVALID_STATE' }, 409)
  }

  const now = Date.now()
  const storedExpiry = order.qr_expires_at
    ? new Date(order.qr_expires_at).getTime()
    : Number.NaN
  const expiresAt = new Date(
    Math.min(
      Number.isFinite(storedExpiry) ? storedExpiry : now + qrLifetimeMs,
      now + qrLifetimeMs,
    ),
  )

  if (expiresAt.getTime() <= now) {
    await service.rpc('expire_unpaid_orders')
    return jsonResponse({ error: 'QR_EXPIRED' }, 409)
  }

  if (order.khqr_md5) {
    return jsonResponse({
      order_id: order.id,
      order_code: order.order_code,
      md5: order.khqr_md5,
      qr_string: order.qr_string ?? order.khqr_md5,
      qr_image_url: qrImageUrl(order.khqr_md5),
      checkout_url: order.khqr_checkout_url,
      amount_cents: order.total_amount,
      expires_at: expiresAt.toISOString(),
    })
  }

  const token = Deno.env.get('KHQRDEV_TOKEN')
  if (!token) return jsonResponse({ error: 'KHQR_NOT_CONFIGURED' }, 503)

  const currency = providerCurrency()
  if (!currency) return jsonResponse({ error: 'KHQR_NOT_CONFIGURED' }, 503)

  const rate = currency === 'KHR' ? khrPerUsd() : null
  if (currency === 'KHR' && rate === null) {
    return jsonResponse({ error: 'KHQR_NOT_CONFIGURED' }, 503)
  }

  const amount = amountForProvider(order.total_amount, currency, rate)
  if (amount === null) return jsonResponse({ error: 'INVALID_AMOUNT' }, 400)

  const providerResponse = await fetch(`${providerBaseUrl()}/generate_qr`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)

  if (!providerResponse) {
    return jsonResponse({ error: 'PROVIDER_UNAVAILABLE' }, 502)
  }
  if (providerResponse.status === 429) {
    return jsonResponse({ error: 'PROVIDER_RATE_LIMITED' }, 429)
  }
  if (!providerResponse.ok) {
    console.error('KHQR.dev generate_qr failed', providerResponse.status)
    return jsonResponse({ error: 'PROVIDER_ERROR' }, 502)
  }

  const providerJson = await providerResponse.json().catch(() => null)
  const data = providerData(providerJson)
  const md5 = typeof data.md5 === 'string' ? data.md5 : null
  if (!md5) return jsonResponse({ error: 'PROVIDER_ERROR' }, 502)

  const qrString =
    typeof data.qr === 'string' && data.qr.length > 0 ? data.qr : md5
  const tranId = typeof data.tran_id === 'string' ? data.tran_id : null
  const checkoutUrl =
    typeof data.checkout_url === 'string' ? data.checkout_url : null

  const { error: saveError } = await service.rpc('set_order_khqr', {
    p_order_id: order.id,
    p_qr_string: qrString,
    p_khqr_md5: md5,
    p_khqr_tran_id: tranId,
    p_khqr_checkout_url: checkoutUrl,
    p_expires_at: expiresAt.toISOString(),
  })

  if (saveError) {
    if (saveError.message.includes('INVALID_STATE')) {
      return jsonResponse({ error: 'INVALID_STATE' }, 409)
    }

    console.error('Could not save KHQR', saveError.message)
    return jsonResponse({ error: 'DATABASE_ERROR' }, 500)
  }

  return jsonResponse({
    order_id: order.id,
    order_code: order.order_code,
    md5,
    qr_string: qrString,
    qr_image_url: qrImageUrl(md5),
    checkout_url: checkoutUrl,
    amount_cents: order.total_amount,
    expires_at: expiresAt.toISOString(),
  })
})

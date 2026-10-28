import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  amountToCents,
  corsHeaders,
  isRecord,
  isUuid,
  jsonResponse,
  khrPerUsd,
  providerBaseUrl,
  providerCurrency,
  providerData,
} from '../_shared/khqr.ts'

const orderFields =
  'id, total_amount, payment_method, payment_status, status, khqr_md5, qr_expires_at, stock_released'

function canReopen(order: Record<string, unknown>): boolean {
  return (
    order.status === 'cancelled' &&
    order.payment_status === 'expired' &&
    order.stock_released === true
  )
}

function snapshot(order: Record<string, unknown>) {
  return {
    result: order.payment_status,
    payment_status: order.payment_status,
    order_status: order.status,
    can_reopen: canReopen(order),
    expires_at: order.qr_expires_at,
  }
}

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

  const checkProvider = body.check_provider !== false
  const service = createClient(supabaseUrl, serviceKey)
  let { data: order, error: orderError } = await service
    .from('orders')
    .select(orderFields)
    .eq('id', body.order_id)
    .maybeSingle()

  if (orderError) {
    console.error('Could not load payment order', orderError.message)
    return jsonResponse({ error: 'DATABASE_ERROR' }, 500)
  }
  if (!order) return jsonResponse({ error: 'ORDER_NOT_FOUND' }, 404)
  if (order.payment_method !== 'khqr') {
    return jsonResponse({ error: 'INVALID_PAYMENT_METHOD' }, 400)
  }

  if (
    order.payment_status !== 'unpaid' ||
    order.status !== 'pending' ||
    !order.khqr_md5
  ) {
    return jsonResponse(snapshot(order))
  }

  // Fast path: read the local order only. The webhook (or a previous provider
  // check) updates the row, so clients can poll this cheaply between the
  // slower KHQR.dev provider checks.
  if (!checkProvider) {
    return jsonResponse(snapshot(order))
  }

  const token = Deno.env.get('KHQRDEV_TOKEN')
  if (!token) return jsonResponse({ error: 'KHQR_NOT_CONFIGURED' }, 503)

  const providerResponse = await fetch(
    `${providerBaseUrl()}/check_transaction_by_md5`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ md5: order.khqr_md5 }),
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => null)

  if (!providerResponse) {
    return jsonResponse({ error: 'PROVIDER_UNAVAILABLE' }, 502)
  }

  if (providerResponse.status === 404) {
    return jsonResponse({
      result: 'unpaid',
      payment_status: 'unpaid',
      order_status: order.status,
      can_reopen: false,
      expires_at: order.qr_expires_at,
    })
  }

  if (providerResponse.status === 400) {
    await service.rpc('expire_unpaid_orders')
    const { data: refreshed } = await service
      .from('orders')
      .select(orderFields)
      .eq('id', body.order_id)
      .maybeSingle()

    if (refreshed) order = refreshed
    return jsonResponse({
      ...snapshot(order),
      result: 'expired',
      payment_status: order.payment_status,
    })
  }

  if (providerResponse.status === 429) {
    return jsonResponse({ error: 'PROVIDER_RATE_LIMITED' }, 429)
  }

  if (!providerResponse.ok) {
    console.error('KHQR.dev check failed', providerResponse.status)
    return jsonResponse({ error: 'PROVIDER_ERROR' }, 502)
  }

  const providerJson = await providerResponse.json().catch(() => null)
  const data = providerData(providerJson)
  const status =
    typeof data.status === 'string' ? data.status.toLowerCase() : null

  if (status === 'scanned') {
    return jsonResponse({
      result: 'scanned',
      payment_status: 'unpaid',
      order_status: order.status,
      can_reopen: false,
      expires_at: order.qr_expires_at,
    })
  }

  const paid =
    status === 'paid' ||
    status === 'success' ||
    status === 'completed' ||
    (status === null && typeof data.paid_at === 'string')

  if (!paid) {
    return jsonResponse({
      result: status ?? 'unpaid',
      payment_status: 'unpaid',
      order_status: order.status,
      can_reopen: false,
      expires_at: order.qr_expires_at,
    })
  }

  const currency = providerCurrency()
  if (!currency) return jsonResponse({ error: 'KHQR_NOT_CONFIGURED' }, 503)

  const rate = currency === 'KHR' ? khrPerUsd() : null
  if (currency === 'KHR' && rate === null) {
    return jsonResponse({ error: 'KHQR_NOT_CONFIGURED' }, 503)
  }

  const amountCents =
    data.amount === undefined || data.amount === null
      ? order.total_amount
      : amountToCents(
          data.amount,
          typeof data.currency === 'string' ? data.currency : currency,
          rate,
        )

  const reference =
    (typeof data.tran_id === 'string' && data.tran_id) ||
    (typeof data.hash === 'string' && data.hash) ||
    order.khqr_md5

  const { data: result, error: markError } = await service.rpc(
    'mark_order_paid',
    {
      p_order_id: order.id,
      p_reference: reference,
      p_amount: amountCents,
    },
  )

  if (markError) {
    console.error('Could not mark order paid', markError.message)
    return jsonResponse({ error: 'DATABASE_ERROR' }, 500)
  }

  const outcome = typeof result === 'string' ? result : 'ignored'
  const paymentStatus =
    outcome === 'paid' || outcome === 'already_paid'
      ? 'paid'
      : outcome.startsWith('flagged')
        ? 'flagged'
        : order.payment_status

  return jsonResponse({
    result: outcome,
    payment_status: paymentStatus,
    order_status: order.status,
    can_reopen: false,
    expires_at: order.qr_expires_at,
  })
})

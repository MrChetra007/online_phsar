import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  amountToCents,
  constantTimeEqualHex,
  hmacSha256Hex,
  isRecord,
  khrPerUsd,
  providerBaseUrl,
  providerCurrency,
  providerData,
} from '../_shared/khqr.ts'

const replayWindowMs = 5 * 60 * 1000

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function providerTransaction(
  md5: string,
  token: string,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(
    `${providerBaseUrl()}/check_transaction_by_md5`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ md5 }),
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => null)

  if (!response?.ok) return null
  return providerData(await response.json().catch(() => null))
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = new Uint8Array(await request.arrayBuffer())

  const secret = Deno.env.get('KHQRDEV_WEBHOOK_SECRET')
  if (!secret) {
    console.error('KHQRDEV_WEBHOOK_SECRET is not configured')
    return new Response(
      JSON.stringify({ ok: false, reason: 'secret_not_configured' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const delivery = Number(request.headers.get('x-rbk-delivery'))
  if (
    !Number.isFinite(delivery) ||
    Math.abs(Date.now() - delivery) > replayWindowMs
  ) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'expired_timestamp' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const signature = request.headers.get('x-rbk-signature') ?? ''
  const expected = await hmacSha256Hex(secret, body)
  if (!constantTimeEqualHex(signature, expected)) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'invalid_signature' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder().decode(body))
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isRecord(payload)) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'invalid_payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const event = text(payload.event)
  const data = isRecord(payload.data) ? payload.data : null
  const identity =
    text(data?.tran_id) ?? text(data?.hash) ?? text(data?.md5) ?? null

  if (!event || !data || !identity) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'invalid_payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'not_configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const service = createClient(supabaseUrl, serviceKey)
  const eventId = `${event}:${identity}`
  const { data: claimed, error: claimError } = await service.rpc(
    'claim_webhook_event',
    {
      p_provider: 'khqr',
      p_event_id: eventId,
      p_payload: payload,
    },
  )

  if (claimError) {
    console.error('Could not claim webhook event', claimError.message)
    return new Response(
      JSON.stringify({ ok: false, reason: 'database_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!claimed) {
    return new Response(JSON.stringify({ ok: true, result: 'duplicate' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  async function finish(result: string): Promise<void> {
    const { error } = await service.rpc('finish_webhook_event', {
      p_provider: 'khqr',
      p_event_id: eventId,
      p_result: result,
    })
    if (error) {
      console.error('Could not finish webhook event', error.message)
    }
  }

  if (event !== 'payment.success') {
    await finish('ignored')
    return new Response(JSON.stringify({ ok: true, result: 'ignored' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const md5 = text(data.md5)
  if (!md5) {
    await finish('invalid_payload')
    return new Response(JSON.stringify({ ok: false, reason: 'missing_md5' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: order, error: orderError } = await service
    .from('orders')
    .select('id, total_amount')
    .eq('khqr_md5', md5)
    .maybeSingle()

  if (orderError) {
    await finish('database_error')
    console.error('Could not load webhook order', orderError.message)
    return new Response(
      JSON.stringify({ ok: false, reason: 'database_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!order) {
    await finish('unknown_order')
    return new Response(JSON.stringify({ ok: true, result: 'unknown_order' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const expectedCurrency = providerCurrency()
  if (!expectedCurrency) {
    await finish('configuration_error')
    return new Response(
      JSON.stringify({ ok: false, reason: 'configuration_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const rate = expectedCurrency === 'KHR' ? khrPerUsd() : null
  if (expectedCurrency === 'KHR' && rate === null) {
    await finish('configuration_error')
    return new Response(
      JSON.stringify({ ok: false, reason: 'configuration_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const payloadCurrency = text(data.currency) ?? expectedCurrency
  let amountCents: number | null = null

  if (data.amount !== undefined && data.amount !== null) {
    amountCents = amountToCents(data.amount, payloadCurrency, rate)
  } else {
    const token = Deno.env.get('KHQRDEV_TOKEN')
    const checked = token ? await providerTransaction(md5, token) : null
    const checkedAmount = checked?.amount

    if (checkedAmount !== undefined && checkedAmount !== null) {
      amountCents = amountToCents(
        checkedAmount,
        text(checked.currency) ?? expectedCurrency,
        rate,
      )
    } else {
      amountCents = order.total_amount
    }
  }

  const reference = text(data.tran_id) ?? text(data.hash) ?? md5
  const { data: result, error: markError } = await service.rpc(
    'mark_order_paid',
    {
      p_order_id: order.id,
      p_reference: reference,
      p_amount: amountCents,
    },
  )

  if (markError) {
    await finish('database_error')
    console.error('Could not mark order paid', markError.message)
    return new Response(
      JSON.stringify({ ok: false, reason: 'database_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const outcome = typeof result === 'string' ? result : 'ignored'
  await finish(outcome)

  return new Response(JSON.stringify({ ok: true, result: outcome }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

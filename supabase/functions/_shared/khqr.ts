export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
}

export function providerData(value: unknown): Record<string, unknown> {
  if (isRecord(value) && isRecord(value.data)) return value.data
  return isRecord(value) ? value : {}
}

export function providerBaseUrl(): string {
  return (
    Deno.env.get('KHQRDEV_BASE_URL') ?? 'https://api.khqr.dev/v1'
  ).replace(/\/+$/, '')
}

export function providerCurrency(): 'USD' | 'KHR' | null {
  const currency = (Deno.env.get('KHQRDEV_CURRENCY') ?? 'USD').toUpperCase()
  return currency === 'USD' || currency === 'KHR' ? currency : null
}

export function khrPerUsd(): number | null {
  const raw = Deno.env.get('KHQRDEV_KHR_PER_USD')
  if (!raw) return null

  const rate = Number(raw)
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

export function amountForProvider(
  totalCents: number,
  currency: 'USD' | 'KHR',
  rate: number | null,
): number | null {
  if (!Number.isInteger(totalCents) || totalCents <= 0) return null

  if (currency === 'USD') {
    const amount = totalCents / 100
    return amount >= 0.01 ? amount : null
  }

  if (rate === null) return null
  const amount = Math.round((totalCents / 100) * rate)
  return amount >= 100 ? amount : null
}

export function amountToCents(
  amount: unknown,
  currency: unknown,
  rate: number | null,
): number | null {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  const code =
    typeof currency === 'string' ? currency.trim().toUpperCase() : undefined
  if (code && code !== 'USD' && code !== 'KHR') return null

  if (!code || code === 'USD') return Math.round(value * 100)
  if (rate === null) return null

  return Math.round((value / rate) * 100)
}

export function qrImageUrl(md5: string): string {
  return `${providerBaseUrl()}/generate_khqr_image/${encodeURIComponent(md5)}`
}

export async function hmacSha256Hex(
  secret: string,
  body: Uint8Array,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, body)

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a.toLowerCase())
  const right = new TextEncoder().encode(b.toLowerCase())
  let difference = left.length ^ right.length

  for (let index = 0; index < left.length && index < right.length; index++) {
    difference |= left[index] ^ right[index]
  }

  return difference === 0
}

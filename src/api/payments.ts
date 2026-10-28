import { supabase } from './client'

export type KhqrPayment = {
  orderId: string
  orderCode: string
  md5: string
  qrString: string
  qrImageUrl: string
  checkoutUrl: string | null
  amountCents: number
  expiresAt: string
}

export type PaymentCheck = {
  result: string
  paymentStatus: string | null
  orderStatus: string | null
  canReopen: boolean
  expiresAt: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value
  throw new Error('INVALID_PAYMENT_RESPONSE')
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }
  throw new Error('INVALID_PAYMENT_RESPONSE')
}

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    let code = 'PAYMENT_UNAVAILABLE'
    const response = (error as { context?: unknown }).context

    if (response instanceof Response) {
      try {
        const payload: unknown = await response.json()
        if (isRecord(payload) && typeof payload.error === 'string') {
          code = payload.error
        }
      } catch {
        code = 'PAYMENT_UNAVAILABLE'
      }
    }

    throw new Error(code)
  }

  if (!isRecord(data)) throw new Error('INVALID_PAYMENT_RESPONSE')
  return data as T
}

export async function generateKhqr(orderId: string): Promise<KhqrPayment> {
  const data = await invoke<Record<string, unknown>>('generate_khqr', {
    order_id: orderId,
  })

  return {
    orderId: asString(data.order_id),
    orderCode: asString(data.order_code),
    md5: asString(data.md5),
    qrString: asString(data.qr_string),
    qrImageUrl: asString(data.qr_image_url),
    checkoutUrl: asOptionalString(data.checkout_url),
    amountCents: asInteger(data.amount_cents),
    expiresAt: asString(data.expires_at),
  }
}

export async function verifyKhqrPayment(
  orderId: string,
  options: { checkProvider?: boolean } = {},
): Promise<PaymentCheck> {
  const data = await invoke<Record<string, unknown>>('verify_khqr_payment', {
    order_id: orderId,
    check_provider: options.checkProvider !== false,
  })

  return {
    result: asString(data.result),
    paymentStatus: asOptionalString(data.payment_status),
    orderStatus: asOptionalString(data.order_status),
    canReopen: data.can_reopen === true,
    expiresAt: asOptionalString(data.expires_at),
  }
}

import type { Database } from '../lib/database.types'
import type { OrderSource } from '../lib/attribution'
import { supabase } from './client'

type PaymentMethod = Database['public']['Enums']['payment_method']

export type CheckoutSettings = {
  codEnabled: boolean
  maintenance: boolean
}

export type CreateOrderItem = {
  variantId: string
  quantity: number
}

export type CreateOrderInput = {
  storeId: string
  items: CreateOrderItem[]
  customerName: string
  customerPhone: string
  address: string
  province: string
  paymentMethod: PaymentMethod
  source?: OrderSource
}

export type OrderResult = {
  orderId: string
  orderCode: string
  paymentMethod: PaymentMethod
  subtotal: number
  deliveryFee: number
  totalAmount: number
  qrExpiresAt: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value
  throw new Error('INVALID_ORDER_RESPONSE')
}

function asInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }
  throw new Error('INVALID_ORDER_RESPONSE')
}

function asPaymentMethod(value: unknown): PaymentMethod {
  if (value === 'cod' || value === 'khqr') return value
  throw new Error('INVALID_ORDER_RESPONSE')
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['cod_enabled', 'maintenance_mode'])

  if (error) throw error

  const settings = new Map((data ?? []).map((row) => [row.key, row.value]))

  return {
    codEnabled: settings.get('cod_enabled') !== false,
    maintenance: settings.get('maintenance_mode') === true,
  }
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderResult> {
  const { data, error } = await supabase.rpc('create_order', {
    p_store_id: input.storeId,
    p_items: input.items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_address: input.address,
    p_province: input.province,
    p_payment_method: input.paymentMethod,
    p_source: input.source ?? 'platform',
  })

  if (error) throw error
  if (!isRecord(data)) throw new Error('INVALID_ORDER_RESPONSE')

  return {
    orderId: asString(data.order_id),
    orderCode: asString(data.order_code),
    paymentMethod: asPaymentMethod(data.payment_method),
    subtotal: asInteger(data.subtotal),
    deliveryFee: asInteger(data.delivery_fee),
    totalAmount: asInteger(data.total_amount),
    qrExpiresAt:
      typeof data.qr_expires_at === 'string' ? data.qr_expires_at : null,
  }
}

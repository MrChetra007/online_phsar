import type { Database } from './database.types'

export type OrderStatus = Database['public']['Enums']['order_status']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type PaymentStatus = Database['public']['Enums']['payment_status']

export type TrackedOrderItem = {
  name: string
  variant: string
  unitPrice: number
  quantity: number
}

export type TrackedHistoryEntry = {
  status: OrderStatus
  at: string
}

export type TrackedOrder = {
  orderCode: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  storeName: string
  province: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  courierName: string | null
  trackingNote: string | null
  createdAt: string
  deliveredAt: string | null
  items: TrackedOrderItem[]
  history: TrackedHistoryEntry[]
  qrString: string | null
  qrExpiresAt: string | null
  canCancel: boolean
  canReopen: boolean
  canConfirmReceived: boolean
  canReportProblem: boolean
}

const orderStatuses: readonly string[] = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'shipped',
  'delivered',
  'completed',
  'paid_out',
  'refused',
  'returned',
  'refunded',
]

const paymentMethods: readonly string[] = ['khqr', 'cod']

const paymentStatuses: readonly string[] = [
  'unpaid',
  'paid',
  'flagged',
  'expired',
  'refund_due',
  'refunded',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function asNullableString(value: unknown): string | null {
  if (value === null) return null
  return asString(value)
}

function asInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function asOrderStatus(value: unknown): OrderStatus {
  if (typeof value === 'string' && orderStatuses.includes(value)) {
    return value as OrderStatus
  }
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function asPaymentMethod(value: unknown): PaymentMethod {
  if (typeof value === 'string' && paymentMethods.includes(value)) {
    return value as PaymentMethod
  }
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function asPaymentStatus(value: unknown): PaymentStatus {
  if (typeof value === 'string' && paymentStatuses.includes(value)) {
    return value as PaymentStatus
  }
  throw new Error('INVALID_TRACKING_RESPONSE')
}

function mapItem(value: unknown): TrackedOrderItem {
  if (!isRecord(value)) throw new Error('INVALID_TRACKING_RESPONSE')

  const quantity = asInteger(value.quantity)
  if (quantity < 1) throw new Error('INVALID_TRACKING_RESPONSE')

  return {
    name: asString(value.name),
    variant: asString(value.variant),
    unitPrice: asInteger(value.unit_price),
    quantity,
  }
}

function mapHistoryEntry(value: unknown): TrackedHistoryEntry {
  if (!isRecord(value)) throw new Error('INVALID_TRACKING_RESPONSE')

  return {
    status: asOrderStatus(value.status),
    at: asString(value.at),
  }
}

export function mapTrackedOrder(value: unknown): TrackedOrder {
  if (!isRecord(value)) throw new Error('INVALID_TRACKING_RESPONSE')

  return {
    orderCode: asString(value.order_code),
    status: asOrderStatus(value.status),
    paymentMethod: asPaymentMethod(value.payment_method),
    paymentStatus: asPaymentStatus(value.payment_status),
    storeName: asNullableString(value.store_name) ?? '',
    province: asString(value.province),
    subtotal: asInteger(value.subtotal),
    deliveryFee: asInteger(value.delivery_fee),
    totalAmount: asInteger(value.total_amount),
    courierName: asNullableString(value.courier_name),
    trackingNote: asNullableString(value.tracking_note),
    createdAt: asString(value.created_at),
    deliveredAt: asNullableString(value.delivered_at),
    items: asArray(value.items).map(mapItem),
    history: asArray(value.history).map(mapHistoryEntry),
    qrString: asNullableString(value.qr_string),
    qrExpiresAt: asNullableString(value.qr_expires_at),
    canCancel: asBoolean(value.can_cancel),
    canReopen: asBoolean(value.can_reopen),
    canConfirmReceived: asBoolean(value.can_confirm_received),
    canReportProblem: asBoolean(value.can_report_problem),
  }
}

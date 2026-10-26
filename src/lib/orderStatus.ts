import type { Database } from './database.types'
import type { TranslationKey } from './i18n/translations'

export type OrderStatus = Database['public']['Enums']['order_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']

export const orderStatusLabels: Record<OrderStatus, TranslationKey> = {
  pending: 'orderStatus.pending',
  confirmed: 'orderStatus.confirmed',
  rejected: 'orderStatus.rejected',
  cancelled: 'orderStatus.cancelled',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  completed: 'orderStatus.completed',
  paid_out: 'orderStatus.paidOut',
  refused: 'orderStatus.refused',
  returned: 'orderStatus.returned',
  refunded: 'orderStatus.refunded',
}

export const orderStatusTones: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-sky-50 text-sky-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700',
  paid_out: 'bg-emerald-50 text-emerald-700',
  refused: 'bg-red-50 text-red-700',
  returned: 'bg-amber-50 text-amber-700',
  refunded: 'bg-slate-100 text-slate-600',
}

export const paymentStatusLabels: Record<PaymentStatus, TranslationKey> = {
  unpaid: 'paymentStatus.unpaid',
  paid: 'paymentStatus.paid',
  flagged: 'paymentStatus.flagged',
  expired: 'paymentStatus.expired',
  refund_due: 'paymentStatus.refundDue',
  refunded: 'paymentStatus.refunded',
}

export const paymentStatusTones: Record<PaymentStatus, string> = {
  unpaid: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  flagged: 'bg-red-50 text-red-700',
  expired: 'bg-red-50 text-red-700',
  refund_due: 'bg-amber-50 text-amber-700',
  refunded: 'bg-slate-100 text-slate-600',
}

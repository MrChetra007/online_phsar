import type { OrderInvoice } from '../../lib/invoice'

export type OrderConfirmationState = OrderInvoice

export type KhqrPaymentState = {
  orderId: string
  orderCode: string
  storeName: string
  storeSlug: string
  customerPhone: string
  totalAmount: number
  qrExpiresAt: string | null
  invoice?: OrderInvoice
}

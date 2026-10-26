import type { Database } from '../../lib/database.types'

export type OrderConfirmationState = {
  orderCode: string
  storeName: string
  storeSlug: string
  paymentMethod: Database['public']['Enums']['payment_method']
  subtotal: number
  deliveryFee: number
  totalAmount: number
}

export type KhqrPaymentState = {
  orderId: string
  orderCode: string
  storeName: string
  storeSlug: string
  customerPhone: string
  totalAmount: number
  qrExpiresAt: string | null
}

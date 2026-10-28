import type { Database } from '../lib/database.types'
import { supabase } from './client'

type OrderStatus = Database['public']['Enums']['order_status']
type PaymentMethod = Database['public']['Enums']['payment_method']
type PaymentStatus = Database['public']['Enums']['payment_status']

export type MyOrderSummary =
  Database['public']['Functions']['list_my_orders']['Returns'][number]

export type MyOrderItem = {
  name: string
  variant: string | null
  unit_price: number
  quantity: number
}

export type MyOrderHistory = {
  status: OrderStatus
  at: string
}

export type MyOrderDetail = {
  order_id: string
  order_code: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  store_name: string | null
  store_slug: string | null
  customer_name: string
  customer_phone: string
  address: string
  province: string
  subtotal: number
  delivery_fee: number
  total_amount: number | null
  courier_name: string | null
  tracking_note: string | null
  created_at: string
  delivered_at: string | null
  items: MyOrderItem[]
  history: MyOrderHistory[]
  qr_string: string | null
  qr_expires_at: string | null
  can_cancel: boolean
  can_reopen: boolean
  can_confirm_received: boolean
  can_report_problem: boolean
}

export async function listMyOrders(): Promise<MyOrderSummary[]> {
  const { data, error } = await supabase.rpc('list_my_orders')
  if (error) throw error
  return data ?? []
}

export async function getMyOrder(
  orderId: string,
): Promise<MyOrderDetail | null> {
  const { data, error } = await supabase.rpc('get_my_order', {
    p_order_id: orderId,
  })
  if (error) throw error
  if (!data || typeof data !== 'object') return null
  return data as unknown as MyOrderDetail
}

export async function listFavoriteProductIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('customer_favorites')
    .select('product_id')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => row.product_id)
}

export async function setProductFavorite(
  productId: string,
  favorite: boolean,
): Promise<void> {
  if (favorite) {
    const { error } = await supabase
      .from('customer_favorites')
      .insert({ product_id: productId })
    if (error && error.code !== '23505') throw error
    return
  }

  const { error } = await supabase
    .from('customer_favorites')
    .delete()
    .eq('product_id', productId)
  if (error) throw error
}

export async function addFavoriteProducts(productIds: string[]): Promise<void> {
  const unique = [...new Set(productIds)]
  if (unique.length === 0) return

  const { error } = await supabase.from('customer_favorites').upsert(
    unique.map((productId) => ({ product_id: productId })),
    { onConflict: 'customer_id,product_id', ignoreDuplicates: true },
  )

  if (!error) return

  await Promise.allSettled(
    unique.map((productId) => setProductFavorite(productId, true)),
  )
}

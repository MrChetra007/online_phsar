import type { Database } from '../lib/database.types'
import { supabase } from './client'

export type StoreOrderStatus = Database['public']['Enums']['order_status']
export type StoreOrderPaymentMethod =
  Database['public']['Enums']['payment_method']
export type StoreOrderPaymentStatus =
  Database['public']['Enums']['payment_status']
export type StoreOrderSource = Database['public']['Enums']['order_source']

export type StoreOrderItem = {
  id: string
  name: string
  variant: string | null
  unitPrice: number
  quantity: number
  imageUrl: string | null
}

export type StoreOrderHistoryEntry = {
  id: string
  oldStatus: StoreOrderStatus | null
  newStatus: StoreOrderStatus
  note: string | null
  createdAt: string
}

export type StoreOrder = {
  id: string
  orderCode: string
  status: StoreOrderStatus
  paymentMethod: StoreOrderPaymentMethod
  paymentStatus: StoreOrderPaymentStatus
  source: StoreOrderSource
  customerName: string
  customerPhone: string
  address: string
  province: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  commissionPercent: number
  commissionAmount: number
  storePayoutAmount: number
  courierName: string | null
  trackingNote: string | null
  stockReleased: boolean
  hasOpenDispute: boolean
  createdAt: string
  confirmedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  items: StoreOrderItem[]
  history: StoreOrderHistoryEntry[]
}

export type StoreOrderStatusChange = {
  note?: string
  courierName?: string
  trackingNote?: string
}

type RawProductImage = {
  url: string
  sort_order: number
}

type RawProduct = {
  product_images?: RawProductImage[] | null
}

type RawVariant = {
  products?: RawProduct | RawProduct[] | null
}

type RawOrderItem = {
  id: string
  name_snapshot: string
  variant_label_snapshot: string | null
  unit_price: number
  quantity: number
  product_variants?: RawVariant | RawVariant[] | null
}

type RawHistoryEntry = {
  id: string
  old_status: StoreOrderStatus | null
  new_status: StoreOrderStatus
  note: string | null
  created_at: string
}

type RawOrder = {
  id: string
  order_code: string
  status: StoreOrderStatus
  payment_method: StoreOrderPaymentMethod
  payment_status: StoreOrderPaymentStatus
  source: StoreOrderSource
  customer_name: string
  customer_phone: string
  address: string
  province: string
  subtotal: number
  delivery_fee: number
  total_amount: number | null
  commission_percent: number
  commission_amount: number
  store_payout_amount: number
  courier_name: string | null
  tracking_note: string | null
  stock_released: boolean
  has_open_dispute: boolean
  created_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  order_items?: RawOrderItem[] | null
  order_status_history?: RawHistoryEntry[] | null
}

const ORDER_COLUMNS = [
  'id',
  'order_code',
  'status',
  'payment_method',
  'payment_status',
  'source',
  'customer_name',
  'customer_phone',
  'address',
  'province',
  'subtotal',
  'delivery_fee',
  'total_amount',
  'commission_percent',
  'commission_amount',
  'store_payout_amount',
  'courier_name',
  'tracking_note',
  'stock_released',
  'has_open_dispute',
  'created_at',
  'confirmed_at',
  'shipped_at',
  'delivered_at',
].join(', ')

const ITEMS_EMBED =
  'order_items ( id, name_snapshot, variant_label_snapshot, unit_price, quantity, product_variants ( products ( product_images ( url, sort_order ) ) ) )'

const HISTORY_EMBED =
  'order_status_history ( id, old_status, new_status, note, created_at )'

function firstItemImage(row: RawOrderItem): string | null {
  const variant = Array.isArray(row.product_variants)
    ? row.product_variants[0]
    : row.product_variants
  const product = Array.isArray(variant?.products)
    ? variant.products[0]
    : variant?.products
  const images = [...(product?.product_images ?? [])]
  images.sort((a, b) => a.sort_order - b.sort_order)
  return images[0]?.url ?? null
}

function mapItem(row: RawOrderItem): StoreOrderItem {
  return {
    id: row.id,
    name: row.name_snapshot,
    variant: row.variant_label_snapshot,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    imageUrl: firstItemImage(row),
  }
}

function mapHistoryEntry(row: RawHistoryEntry): StoreOrderHistoryEntry {
  return {
    id: row.id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    note: row.note,
    createdAt: row.created_at,
  }
}

function mapOrder(row: RawOrder): StoreOrder {
  return {
    id: row.id,
    orderCode: row.order_code,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    source: row.source,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    province: row.province,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    totalAmount: row.total_amount ?? row.subtotal + row.delivery_fee,
    commissionPercent: row.commission_percent,
    commissionAmount: row.commission_amount,
    storePayoutAmount: row.store_payout_amount,
    courierName: row.courier_name,
    trackingNote: row.tracking_note,
    stockReleased: row.stock_released,
    hasOpenDispute: row.has_open_dispute,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    items: (row.order_items ?? []).map(mapItem),
    history: (row.order_status_history ?? []).map(mapHistoryEntry),
  }
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export async function listStoreOrders(storeId: string): Promise<StoreOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`${ORDER_COLUMNS}, ${ITEMS_EMBED}`)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder)
}

export async function getStoreOrder(
  orderId: string,
): Promise<StoreOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`${ORDER_COLUMNS}, ${ITEMS_EMBED}, ${HISTORY_EMBED}`)
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const order = mapOrder(data as unknown as RawOrder)
  order.history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return order
}

export async function changeStoreOrderStatus(
  orderId: string,
  newStatus: StoreOrderStatus,
  options: StoreOrderStatusChange = {},
): Promise<void> {
  const { error } = await supabase.rpc('set_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_note: clean(options.note),
    p_courier_name: clean(options.courierName),
    p_tracking_note: clean(options.trackingNote),
  })

  if (error) throw error
}

export async function restockStoreOrder(
  orderId: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('restock_order', {
    p_order_id: orderId,
    p_note: clean(note),
  })

  if (error) throw error
}

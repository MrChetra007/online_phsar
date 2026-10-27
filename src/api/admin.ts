import type { Database, Json } from '../lib/database.types'
import type { StoreOrderHistoryEntry, StoreOrderItem } from './storeOrders'
import { supabase } from './client'

export type AdminOrderStatus = Database['public']['Enums']['order_status']
export type AdminPaymentStatus = Database['public']['Enums']['payment_status']
export type AdminPaymentMethod = Database['public']['Enums']['payment_method']
export type AdminOrderSource = Database['public']['Enums']['order_source']
export type PlatformSetting =
  Database['public']['Tables']['platform_settings']['Row']

export type AdminOrder = {
  id: string
  orderCode: string
  storeId: string
  storeName: string
  storeSlug: string
  status: AdminOrderStatus
  paymentMethod: AdminPaymentMethod
  paymentStatus: AdminPaymentStatus
  source: AdminOrderSource
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
  paymentReference: string | null
  courierName: string | null
  trackingNote: string | null
  hasOpenDispute: boolean
  problemNote: string | null
  problemReportedAt: string | null
  stockReleased: boolean
  createdAt: string
  paidAt: string | null
  confirmedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  items: StoreOrderItem[]
  history: StoreOrderHistoryEntry[]
}

export type AdminOrderStatusChange = {
  note: string
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
  old_status: AdminOrderStatus | null
  new_status: AdminOrderStatus
  note: string | null
  created_at: string
}

type RawStore = { name: string; slug: string }

type RawOrder = {
  id: string
  order_code: string
  store_id: string
  status: AdminOrderStatus
  payment_method: AdminPaymentMethod
  payment_status: AdminPaymentStatus
  source: AdminOrderSource
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
  payment_reference: string | null
  courier_name: string | null
  tracking_note: string | null
  has_open_dispute: boolean
  problem_note: string | null
  problem_reported_at: string | null
  stock_released: boolean
  created_at: string
  paid_at: string | null
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  stores: RawStore | RawStore[] | null
  order_items?: RawOrderItem[] | null
  order_status_history?: RawHistoryEntry[] | null
}

const ORDER_COLUMNS = [
  'id',
  'order_code',
  'store_id',
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
  'payment_reference',
  'courier_name',
  'tracking_note',
  'has_open_dispute',
  'problem_note',
  'problem_reported_at',
  'stock_released',
  'created_at',
  'paid_at',
  'confirmed_at',
  'shipped_at',
  'delivered_at',
].join(', ')

const STORE_EMBED = 'stores ( name, slug )'

const ITEMS_EMBED =
  'order_items ( id, name_snapshot, variant_label_snapshot, unit_price, quantity, product_variants ( products ( product_images ( url, sort_order ) ) ) )'

const HISTORY_EMBED =
  'order_status_history ( id, old_status, new_status, note, created_at )'

function storeFrom(value: RawOrder['stores']): RawStore {
  if (!value) return { name: '', slug: '' }
  if (Array.isArray(value)) return value[0] ?? { name: '', slug: '' }
  return value
}

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

function mapOrder(row: RawOrder): AdminOrder {
  const store = storeFrom(row.stores)

  return {
    id: row.id,
    orderCode: row.order_code,
    storeId: row.store_id,
    storeName: store.name,
    storeSlug: store.slug,
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
    paymentReference: row.payment_reference,
    courierName: row.courier_name,
    trackingNote: row.tracking_note,
    hasOpenDispute: row.has_open_dispute,
    problemNote: row.problem_note,
    problemReportedAt: row.problem_reported_at,
    stockReleased: row.stock_released,
    createdAt: row.created_at,
    paidAt: row.paid_at,
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

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`${ORDER_COLUMNS}, ${STORE_EMBED}, ${ITEMS_EMBED}`)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder)
}

export async function getAdminOrder(
  orderId: string,
): Promise<AdminOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `${ORDER_COLUMNS}, ${STORE_EMBED}, ${ITEMS_EMBED}, ${HISTORY_EMBED}`,
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const order = mapOrder(data as unknown as RawOrder)
  order.history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return order
}

export async function listPaymentIssues(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`${ORDER_COLUMNS}, ${STORE_EMBED}, ${ITEMS_EMBED}`)
    .in('payment_status', ['flagged', 'refund_due'])
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder)
}

export async function listOpenDisputes(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`${ORDER_COLUMNS}, ${STORE_EMBED}, ${ITEMS_EMBED}`)
    .eq('has_open_dispute', true)
    .order('problem_reported_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder)
}

export async function changeAdminOrderStatus(
  orderId: string,
  newStatus: AdminOrderStatus,
  options: AdminOrderStatusChange,
): Promise<void> {
  const { error } = await supabase.rpc('set_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_note: options.note.trim(),
    p_courier_name: clean(options.courierName),
    p_tracking_note: clean(options.trackingNote),
  })

  if (error) throw error
}

export async function confirmPaymentManually(
  orderId: string,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc('confirm_payment_manually', {
    p_order_id: orderId,
    p_note: note.trim(),
  })

  if (error) throw error
}

export async function markPaymentRefunded(
  orderId: string,
  reference: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_payment_refunded', {
    p_order_id: orderId,
    p_reference: reference.trim(),
    p_note: clean(note),
  })

  if (error) throw error
}

export async function resolveAdminDispute(
  orderId: string,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc('resolve_dispute', {
    p_order_id: orderId,
    p_note: note.trim(),
  })

  if (error) throw error
}

export async function listPlatformSettings(): Promise<PlatformSetting[]> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('key', { ascending: true })

  if (error) throw error
  return data
}

export async function updatePlatformSetting(
  key: string,
  value: Json,
): Promise<void> {
  const { error } = await supabase
    .from('platform_settings')
    .update({ value })
    .eq('key', key)

  if (error) throw error
}

import type { Database } from '../lib/database.types'
import type {
  SettlementDirection,
  StoreLedgerEntry,
  StoreSettlement,
} from './statement'
import { listStoreLedger, listStoreSettlements } from './statement'
import { supabase } from './client'

type OrderStatus = Database['public']['Enums']['order_status']
type PaymentMethod = Database['public']['Enums']['payment_method']

export type SettlementSummary = {
  storeId: string
  storeName: string
  eligibleOrders: number
  khqrPayable: number
  codCommissionOwed: number
  currentBalance: number
  estimatedNet: number
}

export type EligibleOrder = {
  id: string
  orderCode: string
  paymentMethod: PaymentMethod
  status: OrderStatus
  customerName: string
  totalAmount: number
  storePayoutAmount: number
  commissionAmount: number
  commissionPercent: number
  deliveredAt: string
}

export type SettlementResult = {
  settlementId: string
  orders: number
  direction: SettlementDirection
  netAmount: number
}

export type SettlementOrderChoice = {
  id: string
  orderCode: string
  status: OrderStatus
  createdAt: string
}

type RawSummary = {
  store_id: string
  store_name: string
  eligible_orders: number
  khqr_payable: number
  cod_commission_owed: number
  current_balance: number
  estimated_net: number
}

type RawEligibleOrder = {
  id: string
  order_code: string
  payment_method: PaymentMethod
  status: OrderStatus
  customer_name: string
  total_amount: number | null
  store_payout_amount: number
  commission_amount: number
  commission_percent: number
  delivered_at: string
}

type RawOrderChoice = {
  id: string
  order_code: string
  status: OrderStatus
  created_at: string
}

type RawSettlementResult = {
  settlement_id: string
  orders: number
  direction: SettlementDirection
  net_amount: number
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export async function listSettlementSummaries(): Promise<SettlementSummary[]> {
  const { data, error } = await supabase.rpc('get_settlement_summary')

  if (error) throw error

  return ((data ?? []) as RawSummary[]).map((row) => ({
    storeId: row.store_id,
    storeName: row.store_name,
    eligibleOrders: Number(row.eligible_orders),
    khqrPayable: Number(row.khqr_payable),
    codCommissionOwed: Number(row.cod_commission_owed),
    currentBalance: Number(row.current_balance),
    estimatedNet: Number(row.estimated_net),
  }))
}

async function getPayoutHoldDays(): Promise<number> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'payout_hold_days')
    .maybeSingle()

  if (error) throw error

  const value = data?.value
  const days = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(days) && days >= 0 ? Math.floor(days) : 3
}

async function listSettledOrderIds(storeId: string): Promise<Set<string>> {
  const { data: settlements, error: settlementError } = await supabase
    .from('settlements')
    .select('id')
    .eq('store_id', storeId)

  if (settlementError) throw settlementError
  if (!settlements || settlements.length === 0) return new Set()

  const settlementIds = settlements.map((row) => row.id)
  const { data: rows, error } = await supabase
    .from('settlement_orders')
    .select('order_id')
    .in('settlement_id', settlementIds)

  if (error) throw error
  return new Set((rows ?? []).map((row) => row.order_id))
}

export async function listEligibleOrders(
  storeId: string,
): Promise<EligibleOrder[]> {
  const [holdDays, settledIds] = await Promise.all([
    getPayoutHoldDays(),
    listSettledOrderIds(storeId),
  ])

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_code, payment_method, status, customer_name, total_amount, store_payout_amount, commission_amount, commission_percent, delivered_at',
    )
    .eq('store_id', storeId)
    .eq('payment_status', 'paid')
    .eq('has_open_dispute', false)
    .in('status', ['delivered', 'completed'])
    .not('delivered_at', 'is', null)
    .order('delivered_at', { ascending: true })

  if (error) throw error

  const cutoff = Date.now() - holdDays * 24 * 60 * 60 * 1000

  return ((data ?? []) as RawEligibleOrder[])
    .filter(
      (row) =>
        !settledIds.has(row.id) &&
        new Date(row.delivered_at).getTime() <= cutoff,
    )
    .map((row) => ({
      id: row.id,
      orderCode: row.order_code,
      paymentMethod: row.payment_method,
      status: row.status,
      customerName: row.customer_name,
      totalAmount: row.total_amount ?? 0,
      storePayoutAmount: row.store_payout_amount,
      commissionAmount: row.commission_amount,
      commissionPercent: row.commission_percent,
      deliveredAt: row.delivered_at,
    }))
}

export async function listStoreSettlementData(storeId: string): Promise<{
  eligibleOrders: EligibleOrder[]
  ledger: StoreLedgerEntry[]
  settlements: StoreSettlement[]
  orderChoices: SettlementOrderChoice[]
}> {
  const [eligibleOrders, ledger, settlements, orderChoices] = await Promise.all(
    [
      listEligibleOrders(storeId),
      listStoreLedger(storeId),
      listStoreSettlements(storeId),
      listSettlementOrderChoices(storeId),
    ],
  )

  return { eligibleOrders, ledger, settlements, orderChoices }
}

async function listSettlementOrderChoices(
  storeId: string,
): Promise<SettlementOrderChoice[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, status, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return ((data ?? []) as RawOrderChoice[]).map((row) => ({
    id: row.id,
    orderCode: row.order_code,
    status: row.status,
    createdAt: row.created_at,
  }))
}

export async function createSettlement(
  storeId: string,
  orderIds: string[],
  reference?: string,
  note?: string,
): Promise<SettlementResult> {
  const { data, error } = await supabase.rpc('create_settlement', {
    p_store_id: storeId,
    p_order_ids: orderIds,
    p_reference: clean(reference),
    p_note: clean(note),
  })

  if (error) throw error

  const result = data as unknown as RawSettlementResult

  return {
    settlementId: result.settlement_id,
    orders: Number(result.orders),
    direction: result.direction,
    netAmount: Number(result.net_amount),
  }
}

export async function recordCommissionSettled(
  storeId: string,
  amount: number,
  reference: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('record_commission_settled', {
    p_store_id: storeId,
    p_amount: amount,
    p_reference: reference.trim(),
    p_note: clean(note),
  })

  if (error) throw error
}

export async function recordDeduction(
  storeId: string,
  orderId: string,
  amount: number,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc('record_deduction', {
    p_store_id: storeId,
    p_order_id: orderId,
    p_amount: amount,
    p_note: note.trim(),
  })

  if (error) throw error
}

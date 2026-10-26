import type { Database } from '../lib/database.types'
import { supabase } from './client'

export type LedgerType = Database['public']['Enums']['ledger_type']
export type SettlementDirection =
  Database['public']['Enums']['settlement_direction']

export type StoreLedgerEntry = {
  id: string
  type: LedgerType
  amount: number
  affectsBalance: boolean
  note: string | null
  createdAt: string
  orderId: string | null
  orderCode: string | null
}

export type StoreSettlement = {
  id: string
  periodLabel: string
  netAmount: number
  direction: SettlementDirection
  reference: string | null
  note: string | null
  createdAt: string
}

type RawLedgerEntry = {
  id: string
  type: LedgerType
  amount: number
  affects_balance: boolean
  note: string | null
  created_at: string
  order_id: string | null
  orders: { order_code: string } | { order_code: string }[] | null
}

type RawSettlement = {
  id: string
  period_label: string
  net_amount: number
  direction: SettlementDirection
  reference: string | null
  note: string | null
  created_at: string
}

function orderCodeFrom(value: RawLedgerEntry['orders']): string | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0]?.order_code ?? null
  return value.order_code
}

export async function getStoreBalance(storeId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_store_balance', {
    p_store_id: storeId,
  })

  if (error) throw error
  return Number(data ?? 0)
}

export async function listStoreLedger(
  storeId: string,
): Promise<StoreLedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select(
      'id, type, amount, affects_balance, note, created_at, order_id, orders ( order_code )',
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return ((data ?? []) as unknown as RawLedgerEntry[]).map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    affectsBalance: row.affects_balance,
    note: row.note,
    createdAt: row.created_at,
    orderId: row.order_id,
    orderCode: orderCodeFrom(row.orders),
  }))
}

export async function listStoreSettlements(
  storeId: string,
): Promise<StoreSettlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select(
      'id, period_label, net_amount, direction, reference, note, created_at',
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return ((data ?? []) as unknown as RawSettlement[]).map((row) => ({
    id: row.id,
    periodLabel: row.period_label,
    netAmount: row.net_amount,
    direction: row.direction,
    reference: row.reference,
    note: row.note,
    createdAt: row.created_at,
  }))
}

export async function getCodCommissionOwed(storeId: string): Promise<number> {
  const unsettled: Database['public']['Enums']['order_status'][] = [
    'delivered',
    'completed',
  ]

  const { data, error } = await supabase
    .from('orders')
    .select('commission_amount')
    .eq('store_id', storeId)
    .eq('payment_method', 'cod')
    .in('status', unsettled)

  if (error) throw error

  return (data ?? []).reduce(
    (total, row) => total + (row.commission_amount ?? 0),
    0,
  )
}

import { mapTrackedOrder, type TrackedOrder } from '../lib/tracking'
import { supabase } from './client'

function assertOk(value: unknown): void {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    (value as { ok?: unknown }).ok !== true
  ) {
    throw new Error('INVALID_TRACKING_ACTION_RESPONSE')
  }
}

export async function trackOrder(
  orderCode: string,
  phone: string,
): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc('track_order', {
    p_order_code: orderCode,
    p_phone: phone,
  })

  if (error) throw error
  if (data === null) return null

  return mapTrackedOrder(data)
}

export async function cancelCustomerOrder(
  orderCode: string,
  phone: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('customer_cancel_order', {
    p_order_code: orderCode,
    p_phone: phone,
  })

  if (error) throw error
  assertOk(data)
}

export async function confirmOrderReceived(
  orderCode: string,
  phone: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('customer_confirm_received', {
    p_order_code: orderCode,
    p_phone: phone,
  })

  if (error) throw error
  assertOk(data)
}

export async function reportOrderProblem(
  orderCode: string,
  phone: string,
  note: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('report_problem', {
    p_order_code: orderCode,
    p_phone: phone,
    p_note: note,
  })

  if (error) throw error
  assertOk(data)
}

export async function reopenExpiredOrder(
  orderCode: string,
  phone: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('reopen_expired_order', {
    p_order_code: orderCode,
    p_phone: phone,
  })

  if (error) throw error
  if (typeof data !== 'object' || data === null) {
    throw new Error('INVALID_TRACKING_ACTION_RESPONSE')
  }
}

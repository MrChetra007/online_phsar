import { parseOrderInvoice } from '../../lib/invoice'
import type { KhqrPaymentState } from './types'

const keyPrefix = 'kos.payment.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parsePaymentState(value: unknown): KhqrPaymentState | null {
  if (!isRecord(value)) return null

  if (
    typeof value.orderId !== 'string' ||
    value.orderId.length === 0 ||
    typeof value.orderCode !== 'string' ||
    value.orderCode.length === 0 ||
    typeof value.storeName !== 'string' ||
    value.storeName.length === 0 ||
    typeof value.storeSlug !== 'string' ||
    value.storeSlug.length === 0 ||
    typeof value.customerPhone !== 'string' ||
    value.customerPhone.length === 0 ||
    typeof value.totalAmount !== 'number' ||
    !Number.isInteger(value.totalAmount) ||
    value.totalAmount < 0 ||
    (value.qrExpiresAt !== null &&
      (typeof value.qrExpiresAt !== 'string' || value.qrExpiresAt.length === 0))
  ) {
    return null
  }

  const invoice = parseOrderInvoice(value.invoice)
  return {
    orderId: value.orderId,
    orderCode: value.orderCode,
    storeName: value.storeName,
    storeSlug: value.storeSlug,
    customerPhone: value.customerPhone,
    totalAmount: value.totalAmount,
    qrExpiresAt: value.qrExpiresAt,
    ...(invoice && invoice.orderCode === value.orderCode ? { invoice } : {}),
  }
}

export function savePaymentState(state: KhqrPaymentState): void {
  try {
    sessionStorage.setItem(
      `${keyPrefix}${state.orderCode}`,
      JSON.stringify(state),
    )
  } catch {
    return
  }
}

export function readPaymentState(orderCode: string): KhqrPaymentState | null {
  try {
    const raw = sessionStorage.getItem(`${keyPrefix}${orderCode}`)
    if (!raw) return null
    return parsePaymentState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearPaymentState(orderCode: string): void {
  try {
    sessionStorage.removeItem(`${keyPrefix}${orderCode}`)
  } catch {
    return
  }
}

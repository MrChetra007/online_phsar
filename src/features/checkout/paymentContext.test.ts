import { describe, expect, it } from 'vitest'
import { parsePaymentState } from './paymentContext'

const valid = {
  orderId: '6f1e1a1c-6f86-4e18-9f4a-b8a1d94f2b6c',
  orderCode: 'DS-ABC123',
  storeName: 'Local Shop',
  storeSlug: 'local-shop',
  customerPhone: '0965554444',
  totalAmount: 2650,
  qrExpiresAt: '2026-10-26T09:10:00.000Z',
}

describe('parsePaymentState', () => {
  it('accepts a valid payment context', () => {
    expect(parsePaymentState(valid)).toEqual(valid)
  })

  it('accepts a missing QR expiry', () => {
    expect(parsePaymentState({ ...valid, qrExpiresAt: null })).toEqual({
      ...valid,
      qrExpiresAt: null,
    })
  })

  it('rejects missing or malformed fields', () => {
    expect(parsePaymentState(null)).toBeNull()
    expect(parsePaymentState({ ...valid, orderCode: '' })).toBeNull()
    expect(parsePaymentState({ ...valid, totalAmount: 12.5 })).toBeNull()
    expect(parsePaymentState({ ...valid, totalAmount: -1 })).toBeNull()
    expect(parsePaymentState({ ...valid, qrExpiresAt: 123 })).toBeNull()
  })
})

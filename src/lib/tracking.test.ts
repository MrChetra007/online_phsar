import { describe, expect, it } from 'vitest'
import { mapTrackedOrder } from './tracking'

const rawOrder = {
  order_code: 'DS-ABC123',
  status: 'shipped',
  payment_method: 'cod',
  payment_status: 'unpaid',
  store_name: 'Local Shop',
  province: 'Battambang',
  subtotal: 2500,
  delivery_fee: 150,
  total_amount: 2650,
  courier_name: 'VET',
  tracking_note: 'Call before delivery',
  created_at: '2026-10-26T09:00:00.000Z',
  delivered_at: null,
  items: [
    {
      name: 'Cotton Shirt',
      variant: 'M',
      unit_price: 1250,
      quantity: 2,
    },
  ],
  history: [
    { status: 'pending', at: '2026-10-26T09:00:00.000Z' },
    { status: 'shipped', at: '2026-10-26T10:00:00.000Z' },
  ],
  qr_string: null,
  qr_expires_at: null,
  can_cancel: false,
  can_reopen: false,
  can_confirm_received: true,
  can_report_problem: false,
}

describe('mapTrackedOrder', () => {
  it('maps the safe tracking payload', () => {
    expect(mapTrackedOrder(rawOrder)).toEqual({
      orderCode: 'DS-ABC123',
      status: 'shipped',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      storeName: 'Local Shop',
      province: 'Battambang',
      subtotal: 2500,
      deliveryFee: 150,
      totalAmount: 2650,
      courierName: 'VET',
      trackingNote: 'Call before delivery',
      createdAt: '2026-10-26T09:00:00.000Z',
      deliveredAt: null,
      items: [
        {
          name: 'Cotton Shirt',
          variant: 'M',
          unitPrice: 1250,
          quantity: 2,
        },
      ],
      history: [
        { status: 'pending', at: '2026-10-26T09:00:00.000Z' },
        { status: 'shipped', at: '2026-10-26T10:00:00.000Z' },
      ],
      qrString: null,
      qrExpiresAt: null,
      canCancel: false,
      canReopen: false,
      canConfirmReceived: true,
      canReportProblem: false,
    })
  })

  it('keeps action flags exactly as returned by the database', () => {
    const order = mapTrackedOrder({
      ...rawOrder,
      can_cancel: true,
      can_reopen: true,
      can_confirm_received: false,
      can_report_problem: true,
    })

    expect(order.canCancel).toBe(true)
    expect(order.canReopen).toBe(true)
    expect(order.canConfirmReceived).toBe(false)
    expect(order.canReportProblem).toBe(true)
  })

  it('rejects malformed responses', () => {
    expect(() => mapTrackedOrder(null)).toThrow()
    expect(() => mapTrackedOrder({ ...rawOrder, can_cancel: 'yes' })).toThrow()
    expect(() => mapTrackedOrder({ ...rawOrder, status: 'unknown' })).toThrow()
    expect(() => mapTrackedOrder({ ...rawOrder, items: 'nope' })).toThrow()
    expect(() =>
      mapTrackedOrder({
        ...rawOrder,
        items: [{ ...rawOrder.items[0], quantity: 0 }],
      }),
    ).toThrow()
  })
})

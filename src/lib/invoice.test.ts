import { describe, expect, it } from 'vitest'
import {
  buildInvoiceHtml,
  parseOrderInvoice,
  type OrderInvoice,
} from './invoice'
import type { TranslationKey } from './i18n/translations'

const invoice: OrderInvoice = {
  orderCode: 'KOS-12345',
  storeName: 'Khmer Market',
  storeSlug: 'khmer-market',
  customerName: 'Sok Dara',
  customerPhone: '012345678',
  address: '12 Street 271',
  province: 'Phnom Penh',
  paymentMethod: 'cod',
  subtotal: 2500,
  deliveryFee: 150,
  totalAmount: 2650,
  createdAt: '2026-10-27T09:00:00.000Z',
  items: [
    {
      name: 'Green tea',
      variant: '500 g',
      unitPrice: 1250,
      quantity: 2,
    },
  ],
}

const translate = (key: TranslationKey) => key

describe('parseOrderInvoice', () => {
  it('accepts a complete order snapshot', () => {
    expect(parseOrderInvoice(invoice)).toEqual(invoice)
  })

  it('rejects missing customer details and invalid items', () => {
    expect(parseOrderInvoice({ ...invoice, customerName: '' })).toBeNull()
    expect(
      parseOrderInvoice({
        ...invoice,
        items: [{ ...invoice.items[0], quantity: 0 }],
      }),
    ).toBeNull()
    expect(parseOrderInvoice({ ...invoice, items: [] })).toBeNull()
  })
})

describe('buildInvoiceHtml', () => {
  it('includes the order, customer, and totals', () => {
    const html = buildInvoiceHtml(invoice, 'en', translate)

    expect(html).toContain('lang="en"')
    expect(html).toContain('KOS-12345')
    expect(html).toContain('Sok Dara')
    expect(html).toContain('Green tea')
    expect(html).toContain('$26.50')
  })

  it('escapes customer and product text', () => {
    const html = buildInvoiceHtml(
      {
        ...invoice,
        customerName: '<script>alert("name")</script>',
        address: 'Line 1\n<b>Line 2</b>',
        items: [{ ...invoice.items[0], name: '<strong>Tea</strong>' }],
      },
      'en',
      translate,
    )

    expect(html).not.toContain('<script>alert("name")</script>')
    expect(html).not.toContain('<b>Line 2</b>')
    expect(html).not.toContain('<strong>Tea</strong>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Line 1<br />&lt;b&gt;Line 2&lt;/b&gt;')
  })
})

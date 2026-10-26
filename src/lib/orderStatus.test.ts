import { describe, expect, it } from 'vitest'
import { en, km } from './i18n/translations'
import {
  orderStatusLabels,
  orderStatusTones,
  paymentStatusLabels,
  paymentStatusTones,
} from './orderStatus'

const orderStatuses = Object.keys(orderStatusLabels) as Array<
  keyof typeof orderStatusLabels
>
const paymentStatuses = Object.keys(paymentStatusLabels) as Array<
  keyof typeof paymentStatusLabels
>

describe('order status metadata', () => {
  it('maps every order status to both translations and a tone', () => {
    for (const status of orderStatuses) {
      const label = orderStatusLabels[status]
      expect(en[label], `en:${status}`).toBeTruthy()
      expect(km[label], `km:${status}`).toBeTruthy()
      expect(orderStatusTones[status], `tone:${status}`).toContain('text-')
    }
  })

  it('maps every payment status to both translations and a tone', () => {
    for (const status of paymentStatuses) {
      const label = paymentStatusLabels[status]
      expect(en[label], `en:${status}`).toBeTruthy()
      expect(km[label], `km:${status}`).toBeTruthy()
      expect(paymentStatusTones[status], `tone:${status}`).toContain('text-')
    }
  })
})

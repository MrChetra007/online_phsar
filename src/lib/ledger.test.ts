import { describe, expect, it } from 'vitest'
import { en, km } from './i18n/translations'
import { ledgerTypeLabels } from './ledger'

const ledgerTypes = Object.keys(ledgerTypeLabels) as Array<
  keyof typeof ledgerTypeLabels
>

describe('ledgerTypeLabels', () => {
  it('maps every ledger type to both translations', () => {
    for (const type of ledgerTypes) {
      const label = ledgerTypeLabels[type]
      expect(en[label], `en:${type}`).toBeTruthy()
      expect(km[label], `km:${type}`).toBeTruthy()
    }
  })

  it('uses a distinct label key for every ledger type', () => {
    expect(new Set(Object.values(ledgerTypeLabels)).size).toBe(
      ledgerTypes.length,
    )
  })
})

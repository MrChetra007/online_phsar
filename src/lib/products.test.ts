import { describe, expect, it } from 'vitest'
import { commissionCents, payoutCents, priceRange } from './products'

describe('commissionCents', () => {
  it('rounds commission to the nearest cent', () => {
    expect(commissionCents(1000, 30)).toBe(300)
    expect(commissionCents(999, 30)).toBe(300)
    expect(commissionCents(1, 30)).toBe(0)
  })

  it('rejects invalid inputs', () => {
    expect(() => commissionCents(-1, 30)).toThrow()
    expect(() => commissionCents(10, -1)).toThrow()
    expect(() => commissionCents(10, 101)).toThrow()
  })
})

describe('payoutCents', () => {
  it('subtracts commission from the price', () => {
    expect(payoutCents(1000, 30)).toBe(700)
    expect(payoutCents(999, 30)).toBe(699)
  })
})

describe('priceRange', () => {
  it('returns the min and max', () => {
    expect(priceRange([500, 100, 300])).toEqual({ min: 100, max: 500 })
  })

  it('returns null for no prices', () => {
    expect(priceRange([])).toBeNull()
  })
})

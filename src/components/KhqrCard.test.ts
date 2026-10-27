import { describe, expect, it } from 'vitest'
import { formatAmount } from './KhqrCard'

describe('KhqrCard formatAmount', () => {
  it('formats USD with period decimal and exactly 2 decimal places', () => {
    expect(formatAmount(6, 'USD')).toBe('6.00')
    expect(formatAmount(6.5, 'USD')).toBe('6.50')
    expect(formatAmount(6.004, 'USD')).toBe('6.00')
    expect(formatAmount(1250, 'USD')).toBe('1,250.00')
  })

  it('formats KHR with 0 decimal places and comma separators', () => {
    expect(formatAmount(24000, 'KHR')).toBe('24,000')
    expect(formatAmount(1000000, 'KHR')).toBe('1,000,000')
    expect(formatAmount(24000.4, 'KHR')).toBe('24,000')
    expect(formatAmount(24000.6, 'KHR')).toBe('24,001')
  })
})

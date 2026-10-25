import { describe, expect, it } from 'vitest'
import { centsToInput, formatMoney, parseMoneyToCents } from './money'

describe('parseMoneyToCents', () => {
  it('parses common dollar inputs', () => {
    expect(parseMoneyToCents('14.30')).toBe(1430)
    expect(parseMoneyToCents('$1,234.5')).toBe(123450)
    expect(parseMoneyToCents('.5')).toBe(50)
    expect(parseMoneyToCents('0')).toBe(0)
  })

  it('rejects empty, negative, and over-precise values', () => {
    expect(parseMoneyToCents('')).toBeNull()
    expect(parseMoneyToCents('   ')).toBeNull()
    expect(parseMoneyToCents('-1')).toBeNull()
    expect(parseMoneyToCents('1.234')).toBeNull()
    expect(parseMoneyToCents('abc')).toBeNull()
  })
})

describe('centsToInput', () => {
  it('formats cents for a dollar input', () => {
    expect(centsToInput(0)).toBe('0.00')
    expect(centsToInput(1430)).toBe('14.30')
  })

  it('rejects invalid cents', () => {
    expect(() => centsToInput(-1)).toThrow()
    expect(() => centsToInput(1.5)).toThrow()
  })
})

describe('formatMoney', () => {
  it('formats the documented example', () => {
    expect(formatMoney(1430)).toBe('$14.30')
  })

  it('formats zero, cents, and whole dollars', () => {
    expect(formatMoney(0)).toBe('$0.00')
    expect(formatMoney(5)).toBe('$0.05')
    expect(formatMoney(100)).toBe('$1.00')
  })

  it('formats negative amounts', () => {
    expect(formatMoney(-1430)).toBe('-$14.30')
  })

  it('groups thousands', () => {
    expect(formatMoney(123456789)).toBe('$1,234,567.89')
  })

  it('rejects non-integer cents', () => {
    expect(() => formatMoney(14.3)).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { formatDateTime } from './datetime'

describe('formatDateTime', () => {
  it('returns the original value for invalid dates', () => {
    expect(formatDateTime('not-a-date', 'en')).toBe('not-a-date')
    expect(formatDateTime('', 'km')).toBe('')
  })

  it('formats valid dates in both languages', () => {
    const value = '2026-10-26T09:00:00.000Z'
    const english = formatDateTime(value, 'en')
    const khmer = formatDateTime(value, 'km')

    expect(english).toContain('2026')
    expect(english).not.toBe(value)
    expect(khmer).not.toBe(value)
    expect(khmer.length).toBeGreaterThan(0)
  })
})

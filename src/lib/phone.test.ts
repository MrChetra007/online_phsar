import { describe, expect, it } from 'vitest'
import { isValidKhmerPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('matches the database normalisation examples', () => {
    expect(normalizePhone('+855 12 345 678')).toBe('012345678')
    expect(normalizePhone('012 345 678')).toBe('012345678')
    expect(normalizePhone('85512345678')).toBe('012345678')
    expect(normalizePhone('12345678')).toBe('012345678')
  })

  it('returns an empty string when there are no digits', () => {
    expect(normalizePhone('abc')).toBe('')
    expect(normalizePhone('')).toBe('')
  })
})

describe('isValidKhmerPhone', () => {
  it('accepts numbers with 8 to 11 digits after normalisation', () => {
    expect(isValidKhmerPhone('+855 12 345 678')).toBe(true)
    expect(isValidKhmerPhone('012345678')).toBe(true)
  })

  it('rejects short or malformed numbers', () => {
    expect(isValidKhmerPhone('123')).toBe(false)
    expect(isValidKhmerPhone('abc')).toBe(false)
  })
})

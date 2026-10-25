import { describe, expect, it } from 'vitest'
import { errorCodeFrom, getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('maps known codes to both languages', () => {
    expect(getErrorMessage('SOLD_OUT', 'en')).toContain('sold out')
    expect(getErrorMessage('SOLD_OUT', 'km')).toContain('អស់ពីស្តុក')
  })

  it('falls back for unknown codes', () => {
    expect(getErrorMessage('SOMETHING_NEW', 'en')).toContain(
      'Something went wrong',
    )
    expect(getErrorMessage(undefined, 'en')).toContain('Something went wrong')
  })
})

describe('errorCodeFrom', () => {
  it('reads the code from a database error message', () => {
    expect(errorCodeFrom({ message: 'RATE_LIMITED' })).toBe('RATE_LIMITED')
    expect(errorCodeFrom({ message: 'SOLD_OUT: variant-id' })).toBe('SOLD_OUT')
  })

  it('returns null when there is no usable message', () => {
    expect(errorCodeFrom(null)).toBeNull()
    expect(errorCodeFrom({})).toBeNull()
    expect(errorCodeFrom('SOLD_OUT')).toBeNull()
  })
})

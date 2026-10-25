import { describe, expect, it } from 'vitest'
import { authErrorKey } from './authErrors'

describe('authErrorKey', () => {
  it('maps known Supabase auth error codes', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe(
      'auth.errorInvalidCredentials',
    )
    expect(authErrorKey({ code: 'user_already_exists' })).toBe(
      'auth.errorEmailTaken',
    )
  })

  it('falls back for unknown or malformed errors', () => {
    expect(authErrorKey({ code: 'something_new' })).toBe('auth.errorGeneric')
    expect(authErrorKey({})).toBe('auth.errorGeneric')
    expect(authErrorKey('invalid_credentials')).toBe('auth.errorGeneric')
  })
})

import { describe, expect, it } from 'vitest'
import { isValidStoreSlug, slugify, storeSaveErrorKey } from './store'

describe('slugify', () => {
  it('creates a database-compatible slug', () => {
    expect(slugify('Battambang Coffee & Bakery!')).toBe(
      'battambang-coffee-bakery',
    )
    expect(slugify('  Café 123  ')).toBe('cafe-123')
  })

  it('returns an empty slug for Khmer-only names', () => {
    expect(slugify('ហាងកាហ្វេ')).toBe('')
  })

  it('limits the slug to 40 characters', () => {
    expect(slugify('a'.repeat(60))).toHaveLength(40)
  })
})

describe('isValidStoreSlug', () => {
  it('accepts lower-case words and hyphens', () => {
    expect(isValidStoreSlug('abc')).toBe(true)
    expect(isValidStoreSlug('local-coffee-2')).toBe(true)
  })

  it('rejects invalid or unsafe slugs', () => {
    expect(isValidStoreSlug('ab')).toBe(false)
    expect(isValidStoreSlug('Local-Coffee')).toBe(false)
    expect(isValidStoreSlug('coffee-')).toBe(false)
    expect(isValidStoreSlug('a'.repeat(41))).toBe(false)
  })
})

describe('storeSaveErrorKey', () => {
  it('maps duplicate slugs and permission errors', () => {
    expect(storeSaveErrorKey({ code: '23505' })).toBe('store.errorSlugTaken')
    expect(storeSaveErrorKey({ code: '42501' })).toBe('store.errorNotAllowed')
    expect(storeSaveErrorKey({ message: 'FORBIDDEN' })).toBe(
      'store.errorNotAllowed',
    )
  })

  it('falls back to a generic error', () => {
    expect(storeSaveErrorKey(new Error('network'))).toBe('store.errorGeneric')
  })
})

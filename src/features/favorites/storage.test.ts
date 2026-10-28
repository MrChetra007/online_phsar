import { describe, expect, it } from 'vitest'
import { parseGuestFavorites } from './storage'

describe('parseGuestFavorites', () => {
  it('returns an empty list for missing or invalid data', () => {
    expect(parseGuestFavorites(null)).toEqual([])
    expect(parseGuestFavorites('not json')).toEqual([])
    expect(parseGuestFavorites('{"id":"1"}')).toEqual([])
  })

  it('keeps only non-empty string ids', () => {
    expect(parseGuestFavorites('["a", 2, null, "", "b"]')).toEqual(['a', 'b'])
  })

  it('removes duplicate ids while preserving order', () => {
    expect(parseGuestFavorites('["b", "a", "b"]')).toEqual(['b', 'a'])
  })
})

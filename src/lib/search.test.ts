import { describe, expect, it } from 'vitest'
import { escapeLikePattern, normalizeSearchQuery } from './search'

describe('normalizeSearchQuery', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSearchQuery('  shirt  ')).toBe('shirt')
  })

  it('limits the length', () => {
    expect(normalizeSearchQuery('a'.repeat(120))).toHaveLength(100)
  })

  it('returns an empty string for a blank query', () => {
    expect(normalizeSearchQuery('   ')).toBe('')
  })
})

describe('escapeLikePattern', () => {
  it('escapes wildcard and escape characters', () => {
    expect(escapeLikePattern('50%_off\\')).toBe('50\\%\\_off\\\\')
  })

  it('leaves normal text unchanged', () => {
    expect(escapeLikePattern('khmer shirt')).toBe('khmer shirt')
  })
})

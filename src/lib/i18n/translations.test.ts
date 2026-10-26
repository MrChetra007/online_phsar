import { describe, expect, it } from 'vitest'
import { en, km } from './translations'

const englishKeys = Object.keys(en) as Array<keyof typeof en>
const khmerKeys = Object.keys(km) as Array<keyof typeof km>

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

describe('translations', () => {
  it('has the same keys in both languages', () => {
    expect([...khmerKeys].sort()).toEqual([...englishKeys].sort())
  })

  it('has a non-empty string for every key', () => {
    for (const key of englishKeys) {
      expect(en[key].trim(), `en:${key}`).not.toBe('')
      expect(km[key].trim(), `km:${key}`).not.toBe('')
    }
  })

  it('keeps placeholder names in sync', () => {
    for (const key of englishKeys) {
      expect(placeholders(km[key]), `km:${key}`).toEqual(placeholders(en[key]))
    }
  })
})

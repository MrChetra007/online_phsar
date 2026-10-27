import { describe, expect, it } from 'vitest'
import { provinceLabel, provinceOptions, provinces } from './provinces'

describe('provinceLabel', () => {
  it('localizes canonical and legacy values', () => {
    expect(provinceLabel('Phnom Penh', 'km')).toBe('ភ្នំពេញ')
    expect(provinceLabel('ភ្នំពេញ', 'en')).toBe('Phnom Penh')
    expect(provinceLabel('Sihanoukville', 'en')).toBe('Preah Sihanouk')
  })

  it('keeps unknown legacy values unchanged', () => {
    expect(provinceLabel('Somewhere else', 'en')).toBe('Somewhere else')
  })
})

describe('provinceOptions', () => {
  it('provides localized labels and bilingual search keywords', () => {
    const english = provinceOptions('en')
    const khmer = provinceOptions('km')
    const phnomPenh = english.find((option) => option.value === 'Phnom Penh')

    expect(provinces).toHaveLength(25)
    expect(phnomPenh?.label).toBe('Phnom Penh')
    expect(phnomPenh?.keywords).toContain('ភ្នំពេញ')
    expect(khmer.find((option) => option.value === 'Phnom Penh')?.label).toBe(
      'ភ្នំពេញ',
    )
  })
})

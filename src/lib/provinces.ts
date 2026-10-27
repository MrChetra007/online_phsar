import type { Language } from './i18n/context'

export type Province = {
  value: string
  en: string
  km: string
  aliases?: string[]
}

export type ProvinceOption = {
  value: string
  label: string
  keywords: string
}

export const provinces: readonly Province[] = [
  { value: 'Banteay Meanchey', en: 'Banteay Meanchey', km: 'បន្ទាយមានជ័យ' },
  { value: 'Battambang', en: 'Battambang', km: 'បាត់ដំបង' },
  { value: 'Kampong Cham', en: 'Kampong Cham', km: 'កំពង់ចាម' },
  { value: 'Kampong Chhnang', en: 'Kampong Chhnang', km: 'កំពង់ឆ្នាំង' },
  { value: 'Kampong Speu', en: 'Kampong Speu', km: 'កំពង់ស្ពឺ' },
  { value: 'Kampong Thom', en: 'Kampong Thom', km: 'កំពង់ធំ' },
  { value: 'Kampot', en: 'Kampot', km: 'កំពត' },
  { value: 'Kandal', en: 'Kandal', km: 'កណ្តាល' },
  { value: 'Kep', en: 'Kep', km: 'កែប' },
  { value: 'Koh Kong', en: 'Koh Kong', km: 'កោះកុង' },
  { value: 'Kratie', en: 'Kratie', km: 'ក្រចេះ' },
  { value: 'Mondulkiri', en: 'Mondulkiri', km: 'មណ្ឌលគិរី' },
  { value: 'Oddar Meanchey', en: 'Oddar Meanchey', km: 'ឧត្តរមានជ័យ' },
  { value: 'Pailin', en: 'Pailin', km: 'ប៉ៃលិន' },
  { value: 'Phnom Penh', en: 'Phnom Penh', km: 'ភ្នំពេញ' },
  {
    value: 'Preah Sihanouk',
    en: 'Preah Sihanouk',
    km: 'ព្រះសីហនុ',
    aliases: ['Sihanoukville'],
  },
  { value: 'Preah Vihear', en: 'Preah Vihear', km: 'ព្រះវិហារ' },
  { value: 'Prey Veng', en: 'Prey Veng', km: 'ព្រៃវែង' },
  { value: 'Pursat', en: 'Pursat', km: 'ពោធិ៍សាត់' },
  { value: 'Ratanakiri', en: 'Ratanakiri', km: 'រតនគិរី' },
  { value: 'Siem Reap', en: 'Siem Reap', km: 'សៀមរាប' },
  { value: 'Stung Treng', en: 'Stung Treng', km: 'ស្ទឹងត្រែង' },
  { value: 'Svay Rieng', en: 'Svay Rieng', km: 'ស្វាយរៀង' },
  { value: 'Takeo', en: 'Takeo', km: 'តាកែវ' },
  { value: 'Tboung Khmum', en: 'Tboung Khmum', km: 'ត្បូងឃ្មុំ' },
]

export function provinceLabel(value: string, language: Language): string {
  const province = provinces.find(
    (entry) =>
      entry.value === value ||
      entry.en === value ||
      entry.km === value ||
      entry.aliases?.includes(value),
  )
  if (!province) return value
  return language === 'km' ? province.km : province.en
}

export function provinceOptions(language: Language): ProvinceOption[] {
  return provinces.map((province) => ({
    value: province.value,
    label: provinceLabel(province.value, language),
    keywords: [province.en, province.km, ...(province.aliases ?? [])].join(' '),
  }))
}

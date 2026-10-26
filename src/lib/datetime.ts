import type { Language } from './i18n/context'

export function formatDateTime(value: string, language: Language): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language === 'km' ? 'km-KH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

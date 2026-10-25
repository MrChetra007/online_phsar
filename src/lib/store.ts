import type { TranslationKey } from './i18n/translations'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(input: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export function isValidStoreSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 40 && SLUG_PATTERN.test(slug)
}

export function storeSaveErrorKey(error: unknown): TranslationKey {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? (error as { code?: unknown }).code : null
    const message =
      'message' in error ? (error as { message?: unknown }).message : null

    if (code === '23505') return 'store.errorSlugTaken'
    if (code === '42501' || message === 'FORBIDDEN') {
      return 'store.errorNotAllowed'
    }
  }

  return 'store.errorGeneric'
}

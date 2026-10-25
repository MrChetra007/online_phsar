export function normalizePhone(input: string): string {
  let digits = (input ?? '').replace(/\D/g, '')

  if (digits.startsWith('855')) {
    digits = digits.slice(3)
  }

  if (digits === '') return ''
  if (!digits.startsWith('0')) digits = `0${digits}`

  return digits
}

export function isValidKhmerPhone(input: string): boolean {
  const normalized = normalizePhone(input)
  return normalized.length >= 8 && normalized.length <= 11
}

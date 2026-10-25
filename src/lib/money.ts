export function parseMoneyToCents(input: string): number | null {
  const cleaned = (input ?? '').trim().replace(/[$\s,]/g, '')
  if (cleaned === '') return null
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(cleaned)) return null

  const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned
  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2))

  return Number.isSafeInteger(cents) ? cents : null
}

export function centsToInput(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error('centsToInput expects a non-negative integer of cents')
  }

  return (cents / 100).toFixed(2)
}

export function formatMoney(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error('formatMoney expects an integer number of cents')
  }

  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const dollars = Math.floor(absolute / 100)
  const remainder = String(absolute % 100).padStart(2, '0')
  const grouped = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${sign}$${grouped}.${remainder}`
}

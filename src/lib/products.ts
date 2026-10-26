export type PriceRange = {
  min: number
  max: number
}

export function commissionCents(priceCents: number, percent: number): number {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new Error('commissionCents expects non-negative integer cents')
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error('commissionCents expects a percent from 0 to 100')
  }

  return Math.round((priceCents * percent) / 100)
}

export function payoutCents(priceCents: number, percent: number): number {
  return priceCents - commissionCents(priceCents, percent)
}

export function priceRange(prices: number[]): PriceRange | null {
  if (prices.length === 0) return null
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  }
}

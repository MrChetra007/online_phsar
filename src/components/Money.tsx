import { formatMoney } from '../lib/money'

export function Money({
  cents,
  className = '',
}: {
  cents: number
  className?: string
}) {
  return <span className={className}>{formatMoney(cents)}</span>
}

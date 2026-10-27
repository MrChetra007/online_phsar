import { useI18n } from '../lib/i18n'

type QuantityStepperProps = {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  className?: string
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  className = '',
}: QuantityStepperProps) {
  const { t } = useI18n()

  return (
    <div
      className={[
        'inline-flex items-center rounded-full border border-stone-200 bg-white shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        aria-label={t('cart.decrease')}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-2 text-base text-slate-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-medium text-slate-900">
        {value}
      </span>
      <button
        type="button"
        aria-label={t('cart.increase')}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-3 py-2 text-base text-slate-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

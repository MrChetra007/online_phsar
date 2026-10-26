import type { ProductStatus } from '../api/products'
import { useI18n } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n/translations'

const styles: Record<ProductStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-800',
  hidden: 'bg-amber-100 text-amber-800',
}

const labels: Record<ProductStatus, TranslationKey> = {
  draft: 'product.statusDraft',
  active: 'product.statusActive',
  hidden: 'product.statusHidden',
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { t } = useI18n()

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {t(labels[status])}
    </span>
  )
}

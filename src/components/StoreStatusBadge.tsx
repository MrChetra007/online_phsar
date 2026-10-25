import type { StoreStatus } from '../api/stores'
import { useI18n } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n/translations'

const labelKeys: Record<StoreStatus, TranslationKey> = {
  pending: 'store.statusPending',
  active: 'store.statusActive',
  suspended: 'store.statusSuspended',
}

const styles: Record<StoreStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  suspended: 'border-red-200 bg-red-50 text-red-700',
}

export function StoreStatusBadge({ status }: { status: StoreStatus }) {
  const { t } = useI18n()

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {t(labelKeys[status])}
    </span>
  )
}

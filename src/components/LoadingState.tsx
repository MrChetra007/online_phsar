import { useI18n } from '../lib/i18n'

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n()

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 py-12 text-slate-500"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
      />
      <span>{label ?? t('common.loading')}</span>
    </div>
  )
}

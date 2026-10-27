import { useI18n } from '../lib/i18n'
import { Button } from './Button'

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useI18n()

  return (
    <div
      role="alert"
      className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm"
    >
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-xl font-semibold text-red-600">
        !
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {title ?? t('common.errorTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        {message ?? t('common.errorText')}
      </p>
      {onRetry ? (
        <Button className="mt-5 rounded-full" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}

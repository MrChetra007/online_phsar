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
      className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
    >
      <h2 className="text-lg font-semibold text-red-800">
        {title ?? t('common.errorTitle')}
      </h2>
      <p className="mt-2 text-sm text-red-700">
        {message ?? t('common.errorText')}
      </p>
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}

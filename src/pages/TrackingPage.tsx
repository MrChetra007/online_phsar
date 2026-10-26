import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export function TrackingPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')?.trim() ?? ''

  return (
    <section className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('tracking.title')}
      </h1>

      {code ? (
        <p className="mt-4 text-sm text-slate-600">
          {t('tracking.code')}:{' '}
          <span className="select-all break-all font-mono font-semibold text-slate-900">
            {code}
          </span>
        </p>
      ) : null}

      <p className="mt-3 text-slate-600">{t('tracking.comingSoon')}</p>

      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        {t('common.backHome')}
      </Link>
    </section>
  )
}

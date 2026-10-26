import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <section className="mx-auto max-w-lg py-12 text-center">
      <p className="text-sm font-semibold text-emerald-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-slate-600">{t('notFound.text')}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
      >
        {t('notFound.back')}
      </Link>
    </section>
  )
}

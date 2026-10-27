import { Link } from 'react-router-dom'
import { ArrowRightIcon, SparklesIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <section className="mx-auto max-w-lg py-12 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
        <SparklesIcon className="size-8" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-emerald-700">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-slate-600">{t('notFound.text')}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
      >
        {t('notFound.back')}
        <ArrowRightIcon className="size-4" />
      </Link>
    </section>
  )
}

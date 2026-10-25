import { useI18n } from '../lib/i18n'

export function HomePage() {
  const { t } = useI18n()

  return (
    <section className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        {t('home.eyebrow')}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        {t('home.title')}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
        {t('home.subtitle')}
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        {t('home.notice')}
      </div>
    </section>
  )
}

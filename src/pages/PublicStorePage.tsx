import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActiveStoreBySlug, type PublicStore } from '../api/stores'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'

export function PublicStorePage() {
  const { t } = useI18n()
  const { slug } = useParams<{ slug: string }>()

  const [store, setStore] = useState<PublicStore | null>(null)
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!slug) return

    let active = true

    void getActiveStoreBySlug(slug)
      .then((next) => {
        if (active) setStore(next)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (!active) return
        setLoadedSlug(slug)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug, version])

  if (!slug) return null
  if (loading || loadedSlug !== slug) return <LoadingState />
  if (failed) {
    return (
      <ErrorState
        onRetry={() => {
          setFailed(false)
          setLoading(true)
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  if (!store) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          {t('publicStore.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('publicStore.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {t('publicStore.backHome')}
        </Link>
      </section>
    )
  }

  const delivery = [
    {
      label: t('publicStore.local'),
      cents: store.delivery_fee_local,
    },
    {
      label: t('publicStore.other'),
      cents: store.delivery_fee_other,
    },
  ]

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">
          {t('publicStore.localStore')}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{store.name}</h1>
        {store.province ? (
          <p className="mt-2 text-slate-600">{store.province}</p>
        ) : null}

        {store.description ? (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('publicStore.about')}
            </h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">
              {store.description}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">
            {t('publicStore.delivery')}
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {delivery.map((entry) => (
              <div
                key={entry.label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {entry.label}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {entry.cents === 0
                    ? t('publicStore.free')
                    : formatMoney(entry.cents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        {t('publicStore.productsSoon')}
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyStore, type Store, type StoreWithPrivate } from '../../api/stores'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { StoreStatusBadge } from '../../components/StoreStatusBadge'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { useAuth } from '../auth/context'
import { StoreDetailsForm } from './StoreDetailsForm'
import { StoreOnboardingForm } from './StoreOnboardingForm'
import { StorePrivateForm } from './StorePrivateForm'

const bannerStyles = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  suspended: 'border-red-200 bg-red-50 text-red-900',
} as const

const bannerTextKeys: Record<
  Store['status'],
  { title: TranslationKey; text: TranslationKey }
> = {
  pending: { title: 'store.pendingTitle', text: 'store.pendingText' },
  active: { title: 'store.activeTitle', text: 'store.activeText' },
  suspended: {
    title: 'store.suspendedTitle',
    text: 'store.suspendedText',
  },
}

function StoreStatusBanner({ store }: { store: Store }) {
  const { t } = useI18n()
  const copy = bannerTextKeys[store.status]

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${bannerStyles[store.status]}`}
    >
      <p className="text-sm font-semibold">{t(copy.title)}</p>
      <p className="mt-1 text-sm">{t(copy.text)}</p>
      {store.status === 'active' ? (
        <Link
          to={`/s/${store.slug}`}
          className="mt-2 inline-block text-sm font-semibold underline"
        >
          {t('store.publicLink')}
        </Link>
      ) : (
        <p className="mt-2 text-xs">{t('store.hiddenLink')}</p>
      )}
    </div>
  )
}

export function StoreDashboardPage() {
  const { t } = useI18n()
  const { session, initializing } = useAuth()
  const userId = session?.user.id

  const [data, setData] = useState<StoreWithPrivate | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!userId) return

    let active = true

    void getMyStore(userId)
      .then((next) => {
        if (active) setData(next)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, version])

  function reload() {
    setFailed(false)
    setLoading(true)
    setVersion((current) => current + 1)
  }

  if (initializing || !userId) return <LoadingState />
  if (loading) return <LoadingState />

  if (failed) {
    return <ErrorState onRetry={reload} />
  }

  const store = data?.store

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('store.title')}
      </h1>

      {!store ? (
        <div className="mt-6">
          <StoreOnboardingForm userId={userId} onCreated={reload} />
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {store.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  <code>/s/{store.slug}</code>
                </p>
              </div>
              <StoreStatusBadge status={store.status} />
            </div>
            <div className="mt-4">
              <StoreStatusBanner store={store} />
            </div>
          </div>

          <StoreDetailsForm
            store={store}
            disabled={store.status === 'suspended'}
            onUpdated={(updated) =>
              setData((current) =>
                current ? { ...current, store: updated } : current,
              )
            }
          />

          <StorePrivateForm
            storeId={store.id}
            privateInfo={data?.privateInfo ?? null}
            onUpdated={(privateInfo) =>
              setData((current) =>
                current ? { ...current, privateInfo } : current,
              )
            }
          />
        </div>
      )}
    </section>
  )
}

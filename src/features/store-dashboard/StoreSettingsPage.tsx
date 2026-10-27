import { useEffect, useState } from 'react'
import { getMyStore, type StoreWithPrivate } from '../../api/stores'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { useI18n } from '../../lib/i18n'
import { useAuth } from '../auth/context'
import { StoreDetailsForm } from './StoreDetailsForm'
import { StoreOnboardingForm } from './StoreOnboardingForm'
import { StorePrivateForm } from './StorePrivateForm'
import { TelegramConnectSection } from './TelegramConnectSection'

export function StoreSettingsPage() {
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
  if (failed) return <ErrorState onRetry={reload} />

  const store = data?.store

  if (!store) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          {t('storeNav.workspace')}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t('storeNav.settings')}
        </h1>
        <div className="mt-6">
          <StoreOnboardingForm userId={userId} onCreated={reload} />
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
        {t('storeNav.workspace')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {t('storeNav.settings')}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('store.settingsSubtitle')}
      </p>

      <div className="mt-6 space-y-5">
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

        <TelegramConnectSection storeId={store.id} />
      </div>
    </section>
  )
}

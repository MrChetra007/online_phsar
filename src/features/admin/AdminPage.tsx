import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listStoresForAdmin,
  setStoreStatus,
  type Store,
  type StoreStatus,
} from '../../api/stores'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { StoreStatusBadge } from '../../components/StoreStatusBadge'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { AdminNav } from './AdminNav'

const sections: { status: StoreStatus; title: TranslationKey }[] = [
  { status: 'pending', title: 'admin.pending' },
  { status: 'active', title: 'admin.active' },
  { status: 'suspended', title: 'admin.suspended' },
]

export function AdminPage() {
  const { t } = useI18n()

  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<TranslationKey | null>(null)
  const [notice, setNotice] = useState<TranslationKey | null>(null)

  useEffect(() => {
    let active = true

    void listStoresForAdmin()
      .then((next) => {
        if (active) setStores(next)
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
  }, [version])

  async function changeStatus(store: Store, status: StoreStatus) {
    if (status === 'suspended' && !window.confirm(t('admin.confirmSuspend'))) {
      return
    }

    setBusyId(store.id)
    setActionError(null)
    setNotice(null)

    try {
      await setStoreStatus(store.id, status)
      setStores((current) =>
        current.map((entry) =>
          entry.id === store.id ? { ...entry, status } : entry,
        ),
      )
      setNotice('admin.updated')
    } catch {
      setActionError('admin.actionError')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState />
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

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('admin.title')}
      </h1>
      <p className="mt-2 text-slate-600">{t('admin.welcome')}</p>

      <AdminNav />

      {actionError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {t(actionError)}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
        >
          {t(notice)}
        </p>
      ) : null}

      {stores.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.noStores')}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map((section) => {
            const group = stores.filter(
              (store) => store.status === section.status,
            )

            return (
              <div key={section.status}>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t(section.title)}{' '}
                  <span className="text-sm font-normal text-slate-500">
                    ({group.length})
                  </span>
                </h2>

                {group.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {t('admin.empty')}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {group.map((store) => (
                      <li
                        key={store.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {store.name}
                              </p>
                              <StoreStatusBadge status={store.status} />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              <code>/s/{store.slug}</code>
                              {store.province ? ` · ${store.province}` : ''}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {store.status === 'active' ? (
                              <Link
                                to={`/s/${store.slug}`}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                {t('admin.viewStore')}
                              </Link>
                            ) : null}

                            {store.status === 'active' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busyId === store.id}
                                onClick={() =>
                                  void changeStatus(store, 'suspended')
                                }
                              >
                                {t('admin.suspend')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={busyId === store.id}
                                onClick={() =>
                                  void changeStatus(store, 'active')
                                }
                              >
                                {store.status === 'pending'
                                  ? t('admin.approve')
                                  : t('admin.reactivate')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

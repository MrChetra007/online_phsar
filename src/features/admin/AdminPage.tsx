import { useEffect, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  listStoresForAdmin,
  setStoreStatus,
  type Store,
  type StoreStatus,
} from '../../api/stores'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { StoreStatusBadge } from '../../components/StoreStatusBadge'
import {
  ClipboardListIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  ScaleIcon,
  WalletIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { useToast } from '../toast'

const sections: { status: StoreStatus; title: TranslationKey }[] = [
  { status: 'pending', title: 'admin.pending' },
  { status: 'active', title: 'admin.active' },
  { status: 'suspended', title: 'admin.suspended' },
]

const statusDot: Record<StoreStatus, string> = {
  pending: 'bg-amber-500',
  active: 'bg-emerald-500',
  suspended: 'bg-rose-500',
}

type QuickAction = {
  to: string
  labelKey: TranslationKey
  hintKey: TranslationKey
  icon: ComponentType<{ className?: string }>
}

const quickActions: QuickAction[] = [
  {
    to: '/admin/orders',
    labelKey: 'admin.manageOrders',
    hintKey: 'admin.ordersSubtitle',
    icon: ClipboardListIcon,
  },
  {
    to: '/admin/payments',
    labelKey: 'admin.managePayments',
    hintKey: 'admin.paymentsSubtitle',
    icon: CreditCardIcon,
  },
  {
    to: '/admin/disputes',
    labelKey: 'admin.manageDisputes',
    hintKey: 'admin.disputesSubtitle',
    icon: ScaleIcon,
  },
  {
    to: '/admin/settlements',
    labelKey: 'admin.manageSettlements',
    hintKey: 'admin.settlementsSubtitle',
    icon: WalletIcon,
  },
]

export function AdminPage() {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Store | null>(null)
  const [actionError, setActionError] = useState<TranslationKey | null>(null)

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
    setBusyId(store.id)
    setActionError(null)

    try {
      await setStoreStatus(store.id, status)
      setStores((current) =>
        current.map((entry) =>
          entry.id === store.id ? { ...entry, status } : entry,
        ),
      )
      showToast(t('admin.updated'), { tone: 'success' })
    } catch {
      setActionError('admin.actionError')
    } finally {
      setBusyId(null)
    }
  }

  function requestStatusChange(store: Store, status: StoreStatus) {
    if (status === 'suspended') {
      setSuspendTarget(store)
      return
    }

    void changeStatus(store, status)
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

  const counts: Record<StoreStatus, number> = {
    pending: 0,
    active: 0,
    suspended: 0,
  }
  for (const store of stores) counts[store.status] += 1

  const stats: { labelKey: TranslationKey; value: number; accent: string }[] = [
    {
      labelKey: 'admin.totalStores',
      value: stores.length,
      accent: 'text-white',
    },
    {
      labelKey: 'admin.pending',
      value: counts.pending,
      accent: 'text-amber-300',
    },
    {
      labelKey: 'admin.active',
      value: counts.active,
      accent: 'text-emerald-300',
    },
    {
      labelKey: 'admin.suspended',
      value: counts.suspended,
      accent: 'text-rose-300',
    },
  ]

  return (
    <section>
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink px-6 py-8 text-white shadow-2xl shadow-emerald-950/10 sm:px-10 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-64 rounded-full bg-amber-300/10 blur-3xl"
        />

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {t('admin.overviewEyebrow')}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('admin.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/70 sm:text-base">
          {t('admin.welcome')}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3"
            >
              <p
                className={`text-2xl font-semibold tracking-tight ${stat.accent}`}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-50/50">
                {t(stat.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {t(actionError)}
        </p>
      ) : null}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('admin.quickActions')}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon

            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {t(action.labelKey)}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {t(action.hintKey)}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('admin.storeDirectory')}
        </h2>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-stone-200">
          {stores.length}
        </span>
      </div>

      {stores.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.noStores')}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {sections.map((section) => {
            const group = stores.filter(
              (store) => store.status === section.status,
            )

            return (
              <div
                key={section.status}
                className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 rounded-full ${statusDot[section.status]}`}
                  />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t(section.title)}
                  </h3>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {group.length}
                  </span>
                </div>

                {group.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-stone-50 px-3.5 py-3 text-sm text-slate-500">
                    {t('admin.empty')}
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-3 md:grid-cols-2">
                    {group.map((store) => {
                      const initial = (
                        store.name.trim().charAt(0) || 'K'
                      ).toUpperCase()

                      return (
                        <li
                          key={store.id}
                          className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-sm font-bold text-emerald-800 ring-1 ring-stone-200">
                              {store.logo_url ? (
                                <img
                                  src={store.logo_url}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                initial
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-semibold text-slate-900">
                                  {store.name}
                                </p>
                                <StoreStatusBadge status={store.status} />
                              </div>
                              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                                <code>/s/{store.slug}</code>
                                {store.province ? (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{store.province}</span>
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-stone-200/80 pt-3">
                            {store.status === 'active' ? (
                              <Link
                                to={`/s/${store.slug}`}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                <ExternalLinkIcon className="size-4" />
                                {t('admin.viewStore')}
                              </Link>
                            ) : null}

                            {store.status === 'active' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busyId === store.id}
                                onClick={() =>
                                  requestStatusChange(store, 'suspended')
                                }
                              >
                                {t('admin.suspend')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={busyId === store.id}
                                onClick={() =>
                                  requestStatusChange(store, 'active')
                                }
                              >
                                {store.status === 'pending'
                                  ? t('admin.approve')
                                  : t('admin.reactivate')}
                              </Button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {suspendTarget ? (
        <ConfirmDialog
          title={t('admin.confirmSuspendTitle')}
          confirmLabel={t('admin.suspend')}
          cancelLabel={t('admin.cancel')}
          danger
          confirmDisabled={busyId === suspendTarget.id}
          onCancel={() => setSuspendTarget(null)}
          onConfirm={() => {
            const target = suspendTarget
            setSuspendTarget(null)
            void changeStatus(target, 'suspended')
          }}
        >
          <p>{t('admin.confirmSuspend')}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

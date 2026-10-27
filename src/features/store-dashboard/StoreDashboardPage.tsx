import { Link } from 'react-router-dom'
import type { Store } from '../../api/stores'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { StoreStatusBadge } from '../../components/StoreStatusBadge'
import {
  ArrowRightIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  PackageIcon,
  SettingsIcon,
  StoreIcon,
  WalletIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { formatMoney } from '../../lib/money'
import { StoreOnboardingForm } from './StoreOnboardingForm'
import { useMyStore } from './useMyStore'

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

const quickActions: {
  to: string
  labelKey: TranslationKey
  textKey: TranslationKey
  icon: typeof ClipboardListIcon
}[] = [
  {
    to: '/store/orders',
    labelKey: 'storeOrders.title',
    textKey: 'storeOrders.subtitle',
    icon: ClipboardListIcon,
  },
  {
    to: '/store/products',
    labelKey: 'store.productsTitle',
    textKey: 'store.productsSubtitle',
    icon: PackageIcon,
  },
  {
    to: '/store/statement',
    labelKey: 'store.statement',
    textKey: 'storeStatement.subtitle',
    icon: WalletIcon,
  },
  {
    to: '/store/settings',
    labelKey: 'storeNav.settings',
    textKey: 'store.settingsSubtitle',
    icon: SettingsIcon,
  },
]

function StoreStatusBanner({ store }: { store: Store }) {
  const { t } = useI18n()
  const copy = bannerTextKeys[store.status]

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${bannerStyles[store.status]}`}
    >
      <p className="text-sm font-semibold">{t(copy.title)}</p>
      <p className="mt-1 text-sm">{t(copy.text)}</p>
      {store.status !== 'active' ? (
        <p className="mt-2 text-xs">{t('store.hiddenLink')}</p>
      ) : null}
    </div>
  )
}

export function StoreDashboardPage() {
  const { t } = useI18n()
  const { data, store, loading, failed, reload, userId, initializing } =
    useMyStore()

  if (initializing || !userId) return <LoadingState />
  if (loading && !data) return <LoadingState />
  if (failed) return <ErrorState onRetry={reload} />

  if (!store) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          {t('storeNav.overview')}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t('store.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t('storeOverview.subtitle')}
        </p>
        <div className="mt-6">
          <StoreOnboardingForm userId={userId} onCreated={reload} />
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            {t('storeNav.workspace')}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('store.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('storeOverview.subtitle')}
          </p>
        </div>
        <Link
          to="/store/settings"
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-800"
        >
          <SettingsIcon className="size-4" />
          {t('storeNav.settings')}
        </Link>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[2rem] bg-ink text-white shadow-2xl shadow-emerald-950/10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-24 size-80 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-lime-300/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/10 text-2xl font-bold text-emerald-100 ring-1 ring-white/15">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                store.name.trim().slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                {t('storeNav.overview')}
              </p>
              <h2 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {store.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StoreStatusBadge status={store.status} />
                <span className="truncate text-xs text-emerald-50/60">
                  /s/{store.slug}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {store.status !== 'suspended' ? (
              <Link
                to="/store/products/new"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                <PackageIcon className="size-4" />
                {t('store.addProduct')}
              </Link>
            ) : null}
            {store.status === 'active' ? (
              <Link
                to={`/s/${store.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <ExternalLinkIcon className="size-4" />
                {t('store.publicLink')}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <StoreStatusBanner store={store} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('store.province')}
          </p>
          <p className="mt-2 truncate font-semibold text-slate-900">
            {store.province || '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('store.deliveryLocal')}
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {formatMoney(store.delivery_fee_local)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('store.deliveryOther')}
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {formatMoney(store.delivery_fee_other)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
          {t('storeOverview.quickActions')}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon

            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">
                    {t(action.labelKey)}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                    {t(action.textKey)}
                  </span>
                </span>
                <ArrowRightIcon className="mt-1 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-3.5 text-sm text-slate-600">
        <StoreIcon className="size-5 shrink-0 text-emerald-700" />
        <p>{t('store.slugLocked')}</p>
      </div>
    </section>
  )
}

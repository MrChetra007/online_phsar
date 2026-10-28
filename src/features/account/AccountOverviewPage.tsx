import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyOrders, type MyOrderSummary } from '../../api/customer'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Skeleton } from '../../components/Skeleton'
import {
  ArrowRightIcon,
  ClipboardListIcon,
  HeartIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import { useAuth } from '../auth/context'
import { useFavorites } from '../favorites'
import { OrderSummaryCard } from './OrderSummaryCard'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; orders: MyOrderSummary[] }
  | { status: 'error' }

export function AccountOverviewPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { favoriteIds, ready } = useFavorites()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    void listMyOrders()
      .then((orders) => {
        if (active) setState({ status: 'ready', orders })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })

    return () => {
      active = false
    }
  }, [version])

  if (!ready || state.status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={t('account.loadError')}
        onRetry={() => {
          setState({ status: 'loading' })
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  const recent = state.orders.slice(0, 3)
  const name = profile?.full_name?.trim()

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {t('account.title')}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {t('account.hello')}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          {t('account.welcomeText')}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/account/orders"
          className="group flex items-center gap-4 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-stone-100 text-slate-700">
            <ClipboardListIcon className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xl font-bold tracking-tight text-slate-950">
              {state.orders.length}
            </span>
            <span className="block text-xs text-slate-500">
              {t('account.ordersCount')}
            </span>
          </span>
          <ArrowRightIcon className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/account/favorites"
          className="group flex items-center gap-4 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-stone-100 text-slate-700">
            <HeartIcon className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xl font-bold tracking-tight text-slate-950">
              {favoriteIds.length}
            </span>
            <span className="block text-xs text-slate-500">
              {t('account.favoritesCount')}
            </span>
          </span>
          <ArrowRightIcon className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {t('account.recentOrders')}
          </h2>
          {state.orders.length > 0 ? (
            <Link
              to="/account/orders"
              className="text-xs font-semibold text-slate-600 hover:text-slate-950"
            >
              {t('account.viewAll')}
            </Link>
          ) : null}
        </div>

        {recent.length > 0 ? (
          <div className="space-y-2.5">
            {recent.map((order) => (
              <OrderSummaryCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <EmptyState>
            <span className="block">{t('account.ordersEmpty')}</span>
            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
            >
              {t('account.ordersEmptyCta')}
            </Link>
          </EmptyState>
        )}
      </section>
    </div>
  )
}

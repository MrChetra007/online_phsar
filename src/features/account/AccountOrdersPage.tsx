import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyOrders, type MyOrderSummary } from '../../api/customer'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Skeleton } from '../../components/Skeleton'
import { useI18n } from '../../lib/i18n'
import { OrderSummaryCard } from './OrderSummaryCard'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; orders: MyOrderSummary[] }
  | { status: 'error' }

export function AccountOrdersPage() {
  const { t } = useI18n()
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

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">
        {t('account.orders')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {t('account.ordersSubtitle')}
      </p>

      <div className="mt-6">
        {state.status === 'loading' ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-3xl" />
            ))}
          </div>
        ) : state.status === 'error' ? (
          <ErrorState
            message={t('account.loadError')}
            onRetry={() => {
              setState({ status: 'loading' })
              setVersion((current) => current + 1)
            }}
          />
        ) : state.orders.length === 0 ? (
          <EmptyState>
            <span className="block">{t('account.ordersEmpty')}</span>
            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
            >
              {t('account.ordersEmptyCta')}
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-2.5">
            {state.orders.map((order) => (
              <OrderSummaryCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listStoreOrders,
  type StoreOrder,
  type StoreOrderStatus,
} from '../../api/storeOrders'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { formatDateTime } from '../../lib/datetime'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { formatMoney } from '../../lib/money'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/OrderStatusBadge'
import { useMyStore } from './useMyStore'

type Tab = {
  key: string
  labelKey: TranslationKey
  statuses: StoreOrderStatus[] | null
}

const tabs: Tab[] = [
  { key: 'all', labelKey: 'common.all', statuses: null },
  { key: 'pending', labelKey: 'orderStatus.pending', statuses: ['pending'] },
  {
    key: 'confirmed',
    labelKey: 'orderStatus.confirmed',
    statuses: ['confirmed'],
  },
  { key: 'shipped', labelKey: 'orderStatus.shipped', statuses: ['shipped'] },
  {
    key: 'delivered',
    labelKey: 'orderStatus.delivered',
    statuses: ['delivered'],
  },
  {
    key: 'returns',
    labelKey: 'storeOrders.tabReturns',
    statuses: ['refused', 'returned', 'refunded'],
  },
  {
    key: 'closed',
    labelKey: 'storeOrders.tabClosed',
    statuses: ['rejected', 'cancelled', 'completed', 'paid_out'],
  },
]

function itemCount(order: StoreOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0)
}

export function StoreOrdersPage() {
  const { t, language } = useI18n()
  const {
    store,
    loading: storeLoading,
    failed: storeFailed,
    reload,
  } = useMyStore()

  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (!store) return

    let active = true

    void listStoreOrders(store.id)
      .then((next) => {
        if (active) setOrders(next)
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
  }, [store, version])

  const selectedTab = tabs.find((tab) => tab.key === activeTab) ?? tabs[0]

  const visibleOrders = useMemo(() => {
    if (!selectedTab.statuses) return orders
    return orders.filter((order) =>
      selectedTab.statuses?.includes(order.status),
    )
  }, [orders, selectedTab])

  if (storeLoading && !store) return <LoadingState />

  if (storeFailed) {
    return <ErrorState onRetry={reload} />
  }

  if (!store) {
    return (
      <section className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('storeOrders.title')}
        </h1>
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('store.onboardingTitle')}
        </p>
        <Link
          to="/store"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          {t('storeOrders.backToDashboard')}
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('storeOrders.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('storeOrders.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/store/statement"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {t('store.statement')}
          </Link>
          <Link
            to="/store"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {t('storeOrders.backToDashboard')}
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">{t('common.loading')}</p>
      ) : failed ? (
        <div className="mt-6 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
          {t('storeOrders.error')}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setFailed(false)
              setLoading(true)
              setVersion((current) => current + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('storeOrders.empty')}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('storeOrders.emptyFiltered')}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visibleOrders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/store/orders/${order.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-bold text-slate-900">
                      {order.orderCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.customerName} · {order.customerPhone}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(order.createdAt, language)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-600">
                    {order.paymentMethod === 'cod'
                      ? t('order.paymentCod')
                      : t('order.paymentKhqr')}
                    {' · '}
                    {itemCount(order)} {t('storeOrders.items')}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(order.totalAmount)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

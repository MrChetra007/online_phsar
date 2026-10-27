import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listAdminOrders,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminPaymentStatus,
} from '../../api/admin'
import { listStoresForAdmin, type Store } from '../../api/stores'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/OrderStatusBadge'
import { Select } from '../../components/Select'
import { formatDateTime } from '../../lib/datetime'
import { useI18n } from '../../lib/i18n'
import { formatMoney } from '../../lib/money'
import {
  orderStatusLabels,
  paymentStatusLabels,
  type OrderStatus,
  type PaymentStatus,
} from '../../lib/orderStatus'

const orderStatuses = Object.keys(orderStatusLabels) as OrderStatus[]
const paymentStatuses = Object.keys(paymentStatusLabels) as PaymentStatus[]

function itemCount(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0)
}

export function AdminOrdersPage() {
  const { t, language } = useI18n()

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  const [status, setStatus] = useState<'all' | AdminOrderStatus>('all')
  const [paymentStatus, setPaymentStatus] = useState<
    'all' | AdminPaymentStatus
  >('all')
  const [storeId, setStoreId] = useState('all')

  useEffect(() => {
    let active = true

    void Promise.all([listAdminOrders(), listStoresForAdmin()])
      .then(([nextOrders, nextStores]) => {
        if (!active) return
        setOrders(nextOrders)
        setStores(nextStores)
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

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (status !== 'all' && order.status !== status) return false
      if (paymentStatus !== 'all' && order.paymentStatus !== paymentStatus) {
        return false
      }
      if (storeId !== 'all' && order.storeId !== storeId) return false
      return true
    })
  }, [orders, status, paymentStatus, storeId])

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
    <section>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('admin.ordersTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{t('admin.ordersSubtitle')}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Select
          label={t('admin.filterStatus')}
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as 'all' | AdminOrderStatus)
          }
        >
          <option value="all">{t('admin.allStatuses')}</option>
          {orderStatuses.map((entry) => (
            <option key={entry} value={entry}>
              {t(orderStatusLabels[entry])}
            </option>
          ))}
        </Select>

        <Select
          label={t('admin.filterPayment')}
          value={paymentStatus}
          onChange={(event) =>
            setPaymentStatus(event.target.value as 'all' | AdminPaymentStatus)
          }
        >
          <option value="all">{t('admin.allPayments')}</option>
          {paymentStatuses.map((entry) => (
            <option key={entry} value={entry}>
              {t(paymentStatusLabels[entry])}
            </option>
          ))}
        </Select>

        <Select
          label={t('admin.filterStore')}
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
        >
          <option value="all">{t('admin.allStores')}</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </Select>
      </div>

      <p className="mt-5 text-sm text-slate-500">
        {visibleOrders.length} / {orders.length}
      </p>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.noOrders')}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.noMatchingOrders')}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibleOrders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/admin/orders/${order.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-bold text-slate-900">
                      {order.orderCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.storeName} · {order.customerName} ·{' '}
                      {order.customerPhone}
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

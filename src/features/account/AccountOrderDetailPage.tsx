import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyOrder, type MyOrderDetail } from '../../api/customer'
import { ErrorState } from '../../components/ErrorState'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/OrderStatusBadge'
import { Skeleton } from '../../components/Skeleton'
import { ArrowRightIcon } from '../../components/icons'
import { formatDateTime } from '../../lib/datetime'
import { useI18n } from '../../lib/i18n'
import { formatMoney } from '../../lib/money'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; order: MyOrderDetail | null }
  | { status: 'error' }

export function AccountOrderDetailPage() {
  const { t, language } = useI18n()
  const { orderId } = useParams<{ orderId: string }>()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!orderId) return

    let active = true

    void getMyOrder(orderId)
      .then((order) => {
        if (active) setState({ status: 'ready', order })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })

    return () => {
      active = false
    }
  }, [orderId, version])

  if (state.status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
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

  if (!state.order) {
    return (
      <section className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {t('account.orderNotFound')}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t('account.orderNotFoundText')}
        </p>
        <Link
          to="/account/orders"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-950"
        >
          {t('account.backToOrders')}
          <ArrowRightIcon className="size-4" />
        </Link>
      </section>
    )
  }

  const order = state.order
  const total = order.total_amount ?? order.subtotal + order.delivery_fee

  return (
    <div>
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950"
      >
        {t('account.backToOrders')}
      </Link>

      <header className="mt-3 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t('account.orderCode')}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-950">
            {order.order_code}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
          {order.payment_method === 'khqr' ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              KHQR
            </span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {t('checkout.cod')}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {t('account.placedOn')} {formatDateTime(order.created_at, language)}
        </p>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {t('account.items')}
              </h2>
              {order.store_slug ? (
                <Link
                  to={`/s/${order.store_slug}`}
                  className="truncate text-xs font-semibold text-slate-600 hover:text-slate-950"
                >
                  {order.store_name}
                </Link>
              ) : (
                <span className="truncate text-xs text-slate-500">
                  {order.store_name}
                </span>
              )}
            </div>

            <ul className="mt-4 divide-y divide-stone-100">
              {order.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.name}
                    </p>
                    {item.variant ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.variant}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatMoney(item.unit_price * item.quantity)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} × {formatMoney(item.unit_price)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{t('cart.subtotal')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatMoney(order.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">
                  {t('tracking.deliveryTitle')}
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatMoney(order.delivery_fee)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-stone-100 pt-2">
                <dt className="font-semibold text-slate-900">
                  {t('account.total')}
                </dt>
                <dd className="text-base font-bold text-slate-950">
                  {formatMoney(total)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('account.timeline')}
            </h2>
            <ol className="mt-4 space-y-3">
              {order.history.map((entry, index) => (
                <li key={`${entry.status}-${entry.at}`} className="flex gap-3">
                  <span className="relative mt-1 flex size-2.5 shrink-0 rounded-full bg-slate-900">
                    {index < order.history.length - 1 ? (
                      <span className="absolute left-1/2 top-3 h-[calc(100%+0.6rem)] w-px -translate-x-1/2 bg-stone-200" />
                    ) : null}
                  </span>
                  <div className="min-w-0 pb-1">
                    <OrderStatusBadge status={entry.status} />
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(entry.at, language)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('tracking.deliveryTitle')}
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">{t('checkout.name')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.customer_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  {t('checkout.phone')}
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.customer_phone}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  {t('checkout.address')}
                </dt>
                <dd className="mt-0.5 text-slate-700">
                  {order.address}, {order.province}
                </dd>
              </div>
              {order.courier_name ? (
                <div>
                  <dt className="text-xs text-slate-500">
                    {t('tracking.courier')}
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {order.courier_name}
                  </dd>
                </div>
              ) : null}
              {order.tracking_note ? (
                <div>
                  <dt className="text-xs text-slate-500">
                    {t('tracking.trackingNote')}
                  </dt>
                  <dd className="mt-0.5 text-slate-700">
                    {order.tracking_note}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <Link
            to={`/track?code=${encodeURIComponent(order.order_code)}`}
            className="flex items-center justify-between gap-3 rounded-3xl border border-stone-200/80 bg-white p-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-stone-300 hover:shadow-md"
          >
            {t('account.trackOrder')}
            <ArrowRightIcon className="size-4" />
          </Link>
        </aside>
      </div>
    </div>
  )
}

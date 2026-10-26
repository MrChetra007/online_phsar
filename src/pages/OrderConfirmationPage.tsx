import { Link, useLocation, useParams } from 'react-router-dom'
import type { OrderConfirmationState } from '../features/checkout/types'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'

function readConfirmation(value: unknown): OrderConfirmationState | null {
  if (typeof value !== 'object' || value === null) return null

  const state = value as Record<string, unknown>
  if (
    typeof state.orderCode !== 'string' ||
    typeof state.storeName !== 'string' ||
    typeof state.storeSlug !== 'string' ||
    (state.paymentMethod !== 'cod' && state.paymentMethod !== 'khqr') ||
    typeof state.subtotal !== 'number' ||
    typeof state.deliveryFee !== 'number' ||
    typeof state.totalAmount !== 'number'
  ) {
    return null
  }

  return {
    orderCode: state.orderCode,
    storeName: state.storeName,
    storeSlug: state.storeSlug,
    paymentMethod: state.paymentMethod,
    subtotal: state.subtotal,
    deliveryFee: state.deliveryFee,
    totalAmount: state.totalAmount,
  }
}

export function OrderConfirmationPage() {
  const { t } = useI18n()
  const { orderCode } = useParams<{ orderCode: string }>()
  const location = useLocation()
  const confirmation = readConfirmation(location.state)

  if (!confirmation) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('order.missingTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('order.missingText')}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {orderCode ? (
            <Link
              to={`/track?code=${encodeURIComponent(orderCode)}`}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
            >
              {t('order.track')}
            </Link>
          ) : null}
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
          >
            {t('order.continue')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {t('order.title')}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{t('order.subtitle')}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('order.code')}
          </p>
          <p className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-wider text-slate-900">
            {confirmation.orderCode}
          </p>
          <p className="mt-2 text-sm text-slate-600">{t('order.saveCode')}</p>
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-600">{t('order.store')}</dt>
            <dd className="font-medium text-slate-900">
              {confirmation.storeName}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-600">{t('order.payment')}</dt>
            <dd className="font-medium text-slate-900">
              {confirmation.paymentMethod === 'cod'
                ? t('order.paymentCod')
                : t('order.paymentKhqr')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-600">{t('checkout.subtotal')}</dt>
            <dd className="font-medium text-slate-900">
              {formatMoney(confirmation.subtotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-600">{t('order.delivery')}</dt>
            <dd className="font-medium text-slate-900">
              {formatMoney(confirmation.deliveryFee)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-base">
            <dt className="font-semibold text-slate-900">{t('order.total')}</dt>
            <dd className="font-bold text-slate-900">
              {formatMoney(confirmation.totalAmount)}
            </dd>
          </div>
        </dl>

        {confirmation.paymentMethod === 'cod' ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            {t('order.codNote')}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to={`/track?code=${encodeURIComponent(confirmation.orderCode)}`}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            {t('order.track')}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
          >
            {t('order.continue')}
          </Link>
        </div>
      </div>
    </section>
  )
}

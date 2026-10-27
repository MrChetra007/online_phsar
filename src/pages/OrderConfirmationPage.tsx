import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckIcon, StoreIcon } from '../components/icons'
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
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <StoreIcon className="size-8" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('order.missingTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('order.missingText')}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {orderCode ? (
            <Link
              to={`/track?code=${encodeURIComponent(orderCode)}`}
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {t('order.track')}
            </Link>
          ) : null}
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50"
          >
            {t('order.continue')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white shadow-lg shadow-emerald-950/5">
        <div className="relative bg-ink p-6 text-white sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 size-64 rounded-full bg-emerald-500/20 blur-3xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">
              <CheckIcon className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t('order.title')}
              </h1>
              <p className="mt-1 text-sm text-emerald-50/60">
                {t('order.subtitle')}
              </p>
            </div>
          </div>

          <div className="relative mt-6 rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/70">
              {t('order.code')}
            </p>
            <p className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-wider text-white">
              {confirmation.orderCode}
            </p>
            <p className="mt-2 text-xs text-emerald-50/60">
              {t('order.saveCode')}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <dl className="divide-y divide-stone-100 text-sm">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-slate-500">{t('order.store')}</dt>
              <dd className="font-medium text-slate-900">
                <Link
                  to={`/s/${confirmation.storeSlug}`}
                  className="inline-flex items-center gap-1.5 transition hover:text-emerald-700"
                >
                  <StoreIcon className="size-3.5 text-emerald-600" />
                  {confirmation.storeName}
                </Link>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-slate-500">{t('order.payment')}</dt>
              <dd className="font-medium text-slate-900">
                {confirmation.paymentMethod === 'cod'
                  ? t('order.paymentCod')
                  : t('order.paymentKhqr')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-slate-500">{t('checkout.subtotal')}</dt>
              <dd className="font-medium text-slate-900">
                {formatMoney(confirmation.subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-slate-500">{t('order.delivery')}</dt>
              <dd className="font-medium text-slate-900">
                {formatMoney(confirmation.deliveryFee)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 text-base">
              <dt className="font-semibold text-slate-900">
                {t('order.total')}
              </dt>
              <dd className="text-xl font-bold tracking-tight text-slate-950">
                {formatMoney(confirmation.totalAmount)}
              </dd>
            </div>
          </dl>

          {confirmation.paymentMethod === 'cod' ? (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
              {t('order.codNote')}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              to={`/track?code=${encodeURIComponent(confirmation.orderCode)}`}
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {t('order.track')}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50"
            >
              {t('order.continue')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

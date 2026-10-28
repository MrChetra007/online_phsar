import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createOrder,
  getCheckoutSettings,
  type CheckoutSettings,
} from '../../api/orders'
import { getActiveStoreBySlug, type PublicStore } from '../../api/stores'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { SearchSelect } from '../../components/SearchSelect'
import { Skeleton } from '../../components/Skeleton'
import { Textarea } from '../../components/Textarea'
import {
  ArrowRightIcon,
  CartIcon,
  ShieldCheckIcon,
  StoreIcon,
} from '../../components/icons'
import { useAuth } from '../auth/context'
import { useCart } from '../cart'
import { clearOrderSource, getOrderSource } from '../../lib/attribution'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import type { OrderInvoice } from '../../lib/invoice'
import { formatMoney } from '../../lib/money'
import { isValidKhmerPhone } from '../../lib/phone'
import { provinceOptions } from '../../lib/provinces'
import { savePaymentState } from './paymentContext'
import type { KhqrPaymentState, OrderConfirmationState } from './types'

type CheckoutLoadState = {
  requestKey: string
  status: 'loading' | 'ready' | 'error'
  store: PublicStore | null
  settings: CheckoutSettings | null
}

type FormValues = {
  name: string
  phone: string
  address: string
  province: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

type FormFailure = {
  code: string
  itemLabel?: string
}

function errorDetailFrom(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('details' in error)) {
    return null
  }

  const details = (error as { details?: unknown }).details
  return typeof details === 'string' ? details : null
}

const initialValues: FormValues = {
  name: '',
  phone: '',
  address: '',
  province: '',
}

export function CheckoutPage() {
  const { t, language } = useI18n()
  const { session, profile } = useAuth()
  const { cart, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [version, setVersion] = useState(0)
  const [loadState, setLoadState] = useState<CheckoutLoadState>({
    requestKey: '',
    status: 'loading',
    store: null,
    settings: null,
  })
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'khqr'>('khqr')
  const provinceChoices = useMemo(() => provinceOptions(language), [language])

  const cartId = cart?.id
  const cartSlug = cart?.slug

  useEffect(() => {
    if (!session || !profile) return

    let active = true
    queueMicrotask(() => {
      if (!active) return
      setValues((current) => ({
        ...current,
        name: current.name || profile.full_name || '',
        phone: current.phone || profile.phone || '',
      }))
    })

    return () => {
      active = false
    }
  }, [session, profile])

  useEffect(() => {
    if (!cartId || !cartSlug) return

    let active = true
    const requestKey = `${cartId}:${version}`

    void Promise.all([getActiveStoreBySlug(cartSlug), getCheckoutSettings()])
      .then(([store, settings]) => {
        if (!active) return
        setLoadState({ requestKey, status: 'ready', store, settings })
      })
      .catch(() => {
        if (!active) return
        setLoadState({
          requestKey,
          status: 'error',
          store: null,
          settings: null,
        })
      })

    return () => {
      active = false
    }
  }, [cartId, cartSlug, version])

  if (!cart) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <CartIcon className="size-8" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('checkout.title')}
        </h1>
        <p className="mt-3 text-slate-600">{t('cart.empty')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t('cart.browse')}
          <ArrowRightIcon className="size-4" />
        </Link>
      </section>
    )
  }

  const requestKey = `${cart.id}:${version}`
  const ready =
    loadState.requestKey === requestKey && loadState.status === 'ready'

  if (!ready && loadState.status !== 'error') {
    return (
      <section className="mx-auto max-w-5xl">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="mt-3 h-10 w-64 rounded" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </section>
    )
  }

  if (loadState.status === 'error' || !loadState.store || !loadState.settings) {
    return (
      <ErrorState
        message={t('checkout.loadError')}
        onRetry={() => {
          setLoadState((current) => ({ ...current, status: 'loading' }))
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  const store = loadState.store
  const settings = loadState.settings
  const selectedPaymentMethod: 'cod' | 'khqr' = paymentMethod
  const blockedMessage = settings.maintenance
    ? getErrorMessage('MAINTENANCE', language)
    : null

  if (blockedMessage) {
    return (
      <section className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t('checkout.title')}
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm"
        >
          <p className="text-sm leading-relaxed">{blockedMessage}</p>
          <Link
            to="/cart"
            className="mt-4 inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
          >
            {t('checkout.backToCart')}
          </Link>
        </div>
      </section>
    )
  }

  const minFee = Math.min(store.delivery_fee_local, store.delivery_fee_other)
  const maxFee = Math.max(store.delivery_fee_local, store.delivery_fee_other)
  const minTotal = subtotal + minFee
  const maxTotal = subtotal + maxFee

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): FormErrors {
    const next: FormErrors = {}

    if (!values.name.trim()) next.name = t('checkout.errorName')
    if (!isValidKhmerPhone(values.phone)) {
      next.phone = getErrorMessage('INVALID_PHONE', language)
    }
    if (!values.address.trim()) next.address = t('checkout.errorAddress')
    if (!values.province.trim()) next.province = t('checkout.errorProvince')

    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cart) return

    const nextErrors = validate()
    setErrors(nextErrors)
    setFailure(null)

    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)

    try {
      const result = await createOrder({
        storeId: cart.id,
        items: cart.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customerName: values.name.trim(),
        customerPhone: values.phone.trim(),
        address: values.address.trim(),
        province: values.province.trim(),
        paymentMethod: selectedPaymentMethod,
        source: getOrderSource(),
      })

      const invoice: OrderInvoice = {
        orderCode: result.orderCode,
        storeName: cart.name,
        storeSlug: cart.slug,
        customerName: values.name.trim(),
        customerPhone: values.phone.trim(),
        address: values.address.trim(),
        province: values.province.trim(),
        paymentMethod: result.paymentMethod,
        subtotal: result.subtotal,
        deliveryFee: result.deliveryFee,
        totalAmount: result.totalAmount,
        createdAt: new Date().toISOString(),
        items: cart.items.map((item) => ({
          name: item.productName,
          variant: item.variantLabel === 'Default' ? null : item.variantLabel,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      }

      if (result.paymentMethod === 'khqr') {
        const payment: KhqrPaymentState = {
          orderId: result.orderId,
          orderCode: result.orderCode,
          storeName: cart.name,
          storeSlug: cart.slug,
          customerPhone: values.phone.trim(),
          totalAmount: result.totalAmount,
          qrExpiresAt: result.qrExpiresAt,
          invoice,
        }

        savePaymentState(payment)
        clearCart()
        clearOrderSource()
        navigate(`/pay/${encodeURIComponent(result.orderCode)}`, {
          replace: true,
          state: payment,
        })
        return
      }

      const confirmation: OrderConfirmationState = invoice

      clearCart()
      clearOrderSource()
      navigate(`/order/${encodeURIComponent(result.orderCode)}`, {
        replace: true,
        state: confirmation,
      })
    } catch (error) {
      const code = errorCodeFrom(error)

      if (code === 'INVALID_PHONE') {
        setErrors((current) => ({
          ...current,
          phone: getErrorMessage('INVALID_PHONE', language),
        }))
      } else if (code === 'SOLD_OUT') {
        const variantId = errorDetailFrom(error)
        const item = cart.items.find(
          (current) => current.variantId === variantId,
        )
        const itemLabel = item
          ? item.variantLabel === 'Default'
            ? item.productName
            : `${item.productName} (${item.variantLabel})`
          : undefined

        setFailure({ code, itemLabel })
      } else {
        setFailure({ code: code ?? 'UNKNOWN' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
      >
        <ArrowRightIcon className="size-4 rotate-180" />
        {t('checkout.backToCart')}
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t('checkout.title')}
          </h1>
          <p className="mt-2 flex max-w-md items-start gap-1.5 text-sm text-slate-500">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            {t('checkout.secureNote')}
          </p>
        </div>
        <Link
          to={`/s/${store.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-stone-200/80 transition hover:text-emerald-700 hover:ring-emerald-300"
        >
          <StoreIcon className="size-3.5 text-emerald-600" />
          {store.name}
        </Link>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-5">
          <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                {t('checkout.customerTitle')}
              </h2>
            </div>
            <div className="mt-5 space-y-4">
              <Input
                label={t('checkout.name')}
                value={values.name}
                onChange={(event) => updateValue('name', event.target.value)}
                error={errors.name}
                autoComplete="name"
                maxLength={100}
                required
              />
              <Input
                label={t('checkout.phone')}
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => updateValue('phone', event.target.value)}
                hint={t('checkout.phoneHint')}
                error={errors.phone}
                autoComplete="tel"
                maxLength={30}
                required
              />
              <Textarea
                label={t('checkout.address')}
                value={values.address}
                onChange={(event) => updateValue('address', event.target.value)}
                error={errors.address}
                autoComplete="street-address"
                maxLength={500}
                rows={3}
                required
              />
              <SearchSelect
                label={t('checkout.province')}
                value={values.province}
                options={provinceChoices}
                onChange={(value) => updateValue('province', value)}
                placeholder={t('checkout.provincePlaceholder')}
                emptyText={t('checkout.provinceEmpty')}
                error={errors.province}
                required
              />
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                2
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                {t('checkout.paymentTitle')}
              </h2>
            </div>

            <div className="mt-5 space-y-2.5">
              <div
                className="flex cursor-not-allowed select-none gap-3 rounded-2xl border-2 border-stone-200 bg-stone-100/70 p-4 opacity-60 transition"
                aria-disabled="true"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={false}
                  disabled
                  readOnly
                  aria-disabled="true"
                  tabIndex={-1}
                  className="mt-1 size-4 cursor-not-allowed accent-stone-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="block text-sm font-semibold text-slate-500">
                      {t('checkout.cod')}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      ({t('checkout.comingSoon')})
                    </span>
                  </div>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-400">
                    {t('checkout.codHint')}
                  </span>
                </div>
              </div>

              <label className="flex cursor-pointer gap-3 rounded-2xl border-2 border-emerald-600 bg-emerald-50/60 p-4 transition">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="khqr"
                  checked={true}
                  onChange={() => setPaymentMethod('khqr')}
                  className="mt-1 size-4 accent-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-emerald-950">
                    {t('checkout.khqr')}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                    {t('checkout.khqrHint')}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-3xl bg-ink p-5 text-white shadow-xl shadow-emerald-950/10 sm:p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">{t('checkout.summary')}</h2>

          <ul className="mt-4 space-y-3 border-b border-white/10 pb-4 text-sm">
            {cart.items.map((item) => (
              <li
                key={item.variantId}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0 break-words text-emerald-50/70">
                  {item.productName} × {item.quantity}
                  {item.variantLabel !== 'Default' ? (
                    <span className="block text-xs text-emerald-50/60">
                      {item.variantLabel}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium text-white">
                  {formatMoney(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-emerald-50/60">{t('checkout.subtotal')}</dt>
              <dd className="font-medium text-white">
                {formatMoney(subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-emerald-50/60">
                {t('checkout.deliveryEstimate')}
              </dt>
              <dd className="font-medium text-white">
                {minFee === maxFee
                  ? formatMoney(minFee)
                  : `${formatMoney(minFee)} – ${formatMoney(maxFee)}`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <dt className="font-semibold text-white">
                {t('checkout.totalEstimate')}
              </dt>
              <dd className="text-xl font-bold tracking-tight text-white">
                {minTotal === maxTotal
                  ? formatMoney(minTotal)
                  : `${formatMoney(minTotal)} – ${formatMoney(maxTotal)}`}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-xs leading-relaxed text-emerald-50/60">
            {t('checkout.deliveryNote')}
          </p>

          {failure ? (
            <div
              role="alert"
              className="mt-4 rounded-2xl bg-red-400/10 p-3 text-sm text-red-200 ring-1 ring-red-300/20"
            >
              <p>{getErrorMessage(failure.code, language)}</p>
              {failure.itemLabel ? (
                <p className="mt-1 font-semibold">
                  {t('checkout.soldOutItem')} {failure.itemLabel}
                </p>
              ) : null}
              {failure.code === 'SOLD_OUT' ? (
                <Link
                  to="/cart"
                  className="mt-2 inline-block font-semibold text-red-100 underline"
                >
                  {t('checkout.updateCart')}
                </Link>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
            {!submitting ? <ArrowRightIcon className="size-4" /> : null}
          </button>
        </aside>
      </form>
    </section>
  )
}

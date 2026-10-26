import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createOrder,
  getCheckoutSettings,
  type CheckoutSettings,
} from '../../api/orders'
import { getActiveStoreBySlug, type PublicStore } from '../../api/stores'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { Skeleton } from '../../components/Skeleton'
import { Textarea } from '../../components/Textarea'
import { useCart } from '../cart'
import { clearOrderSource, getOrderSource } from '../../lib/attribution'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import { formatMoney } from '../../lib/money'
import { isValidKhmerPhone } from '../../lib/phone'
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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'khqr'>('cod')

  const cartId = cart?.id
  const cartSlug = cart?.slug

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
        <h1 className="text-3xl font-bold text-slate-900">
          {t('checkout.title')}
        </h1>
        <p className="mt-3 text-slate-600">{t('cart.empty')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          {t('cart.browse')}
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
        <Skeleton className="h-8 w-48 rounded" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
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
  const selectedPaymentMethod = settings.codEnabled ? paymentMethod : 'khqr'
  const blockedMessage = settings.maintenance
    ? getErrorMessage('MAINTENANCE', language)
    : null

  if (blockedMessage) {
    return (
      <section className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('checkout.title')}
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
        >
          <p className="text-sm leading-relaxed">{blockedMessage}</p>
          <Link
            to="/cart"
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
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

      if (result.paymentMethod === 'khqr') {
        const payment: KhqrPaymentState = {
          orderId: result.orderId,
          orderCode: result.orderCode,
          storeName: cart.name,
          storeSlug: cart.slug,
          customerPhone: values.phone.trim(),
          totalAmount: result.totalAmount,
          qrExpiresAt: result.qrExpiresAt,
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

      const confirmation: OrderConfirmationState = {
        orderCode: result.orderCode,
        storeName: cart.name,
        storeSlug: cart.slug,
        paymentMethod: result.paymentMethod,
        subtotal: result.subtotal,
        deliveryFee: result.deliveryFee,
        totalAmount: result.totalAmount,
      }

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
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        ← {t('checkout.backToCart')}
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('checkout.title')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{store.name}</p>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('checkout.customerTitle')}
            </h2>
            <div className="mt-4 space-y-4">
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
              <Input
                label={t('checkout.province')}
                value={values.province}
                onChange={(event) =>
                  updateValue('province', event.target.value)
                }
                placeholder={t('checkout.provincePlaceholder')}
                error={errors.province}
                autoComplete="address-level1"
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('checkout.paymentTitle')}
            </h2>

            <div className="mt-4 space-y-2">
              <label
                className={[
                  'flex gap-3 rounded-xl border p-3',
                  selectedPaymentMethod === 'cod'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 bg-white',
                  settings.codEnabled
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-60',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={selectedPaymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  disabled={!settings.codEnabled}
                  className="mt-1 size-4 accent-emerald-600"
                />
                <span>
                  <span
                    className={[
                      'block text-sm font-semibold',
                      selectedPaymentMethod === 'cod'
                        ? 'text-emerald-900'
                        : 'text-slate-800',
                    ].join(' ')}
                  >
                    {t('checkout.cod')}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-600">
                    {settings.codEnabled
                      ? t('checkout.codHint')
                      : getErrorMessage('COD_DISABLED', language)}
                  </span>
                </span>
              </label>

              <label
                className={[
                  'flex cursor-pointer gap-3 rounded-xl border p-3',
                  selectedPaymentMethod === 'khqr'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 bg-white',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="khqr"
                  checked={selectedPaymentMethod === 'khqr'}
                  onChange={() => setPaymentMethod('khqr')}
                  className="mt-1 size-4 accent-emerald-600"
                />
                <span>
                  <span
                    className={[
                      'block text-sm font-semibold',
                      selectedPaymentMethod === 'khqr'
                        ? 'text-emerald-900'
                        : 'text-slate-800',
                    ].join(' ')}
                  >
                    {t('checkout.khqr')}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-600">
                    {t('checkout.khqrHint')}
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('checkout.summary')}
          </h2>

          <ul className="mt-3 space-y-2 border-b border-slate-200 pb-3 text-sm">
            {cart.items.map((item) => (
              <li
                key={item.variantId}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0 break-words text-slate-600">
                  {item.productName} × {item.quantity}
                  {item.variantLabel !== 'Default' ? (
                    <span className="block text-xs text-slate-500">
                      {item.variantLabel}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatMoney(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">{t('checkout.subtotal')}</dt>
              <dd className="font-medium text-slate-900">
                {formatMoney(subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">
                {t('checkout.deliveryEstimate')}
              </dt>
              <dd className="font-medium text-slate-900">
                {minFee === maxFee
                  ? formatMoney(minFee)
                  : `${formatMoney(minFee)} – ${formatMoney(maxFee)}`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">
                {t('checkout.totalEstimate')}
              </dt>
              <dd className="font-bold text-slate-900">
                {minTotal === maxTotal
                  ? formatMoney(minTotal)
                  : `${formatMoney(minTotal)} – ${formatMoney(maxTotal)}`}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {t('checkout.deliveryNote')}
          </p>

          {failure ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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
                  className="mt-2 inline-block font-semibold underline"
                >
                  {t('checkout.updateCart')}
                </Link>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" disabled={submitting} className="mt-4 w-full">
            {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
          </Button>
        </aside>
      </form>
    </section>
  )
}

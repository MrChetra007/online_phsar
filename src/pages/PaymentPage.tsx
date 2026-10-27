import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  generateKhqr,
  verifyKhqrPayment,
  type KhqrPayment,
  type PaymentCheck,
} from '../api/payments'
import { reopenExpiredOrder } from '../api/tracking'
import {
  CheckIcon,
  DownloadIcon,
  ShieldCheckIcon,
  StoreIcon,
} from '../components/icons'
import { KhqrCard } from '../components/KhqrCard'
import { errorCodeFrom, getErrorMessage } from '../lib/errors'
import { useI18n } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n/translations'
import { downloadInvoice, downloadInvoiceAutomatically } from '../lib/invoice'
import { formatMoney } from '../lib/money'
import {
  clearPaymentState,
  parsePaymentState,
  readPaymentState,
} from '../features/checkout/paymentContext'
import type { KhqrPaymentState } from '../features/checkout/types'

type PaymentStatus =
  'loading' | 'ready' | 'paid' | 'expired' | 'flagged' | 'cancelled' | 'error'

const paymentErrorKeys: Record<string, TranslationKey> = {
  QR_EXPIRED: 'payment.errorExpired',
  INVALID_STATE: 'payment.errorExpired',
  PROVIDER_RATE_LIMITED: 'payment.errorRateLimited',
  KHQR_NOT_CONFIGURED: 'payment.errorUnavailable',
  NOT_CONFIGURED: 'payment.errorUnavailable',
  PROVIDER_UNAVAILABLE: 'payment.errorUnavailable',
  PROVIDER_ERROR: 'payment.errorUnavailable',
  PAYMENT_UNAVAILABLE: 'payment.errorUnavailable',
  INVALID_AMOUNT: 'payment.errorAmount',
  INVALID_PAYMENT_RESPONSE: 'payment.errorGeneric',
  SOLD_OUT: 'payment.errorSoldOut',
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function PaymentPage() {
  const { t, language } = useI18n()
  const { orderCode } = useParams<{ orderCode: string }>()
  const location = useLocation()
  const [context] = useState<KhqrPaymentState | null>(() => {
    const fromNavigation = parsePaymentState(location.state)
    if (fromNavigation && fromNavigation.orderCode === orderCode) {
      return fromNavigation
    }
    return orderCode ? readPaymentState(orderCode) : null
  })
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [payment, setPayment] = useState<KhqrPayment | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [checkDelayed, setCheckDelayed] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [reopening, setReopening] = useState(false)
  const started = useRef(false)
  const checking = useRef(false)

  useEffect(() => {
    if (status === 'paid' && context?.invoice) {
      downloadInvoiceAutomatically(context.invoice, language, t)
    }
  }, [status, context, language, t])

  const requestQr = useCallback(async () => {
    if (!context) return

    setStatus('loading')
    setErrorCode(null)
    setCheckDelayed(false)

    try {
      const next = await generateKhqr(context.orderId)
      setPayment(next)
      setStatus('ready')
      setRemaining(
        Math.max(
          0,
          Math.ceil((new Date(next.expiresAt).getTime() - Date.now()) / 1000),
        ),
      )
    } catch (error) {
      const code = errorCodeFrom(error)

      if (code === 'QR_EXPIRED') {
        setStatus('expired')
      } else if (code === 'INVALID_STATE') {
        try {
          const check = await verifyKhqrPayment(context.orderId)
          if (check.result === 'paid' || check.paymentStatus === 'paid') {
            setStatus('paid')
            clearPaymentState(context.orderCode)
            return
          }
          if (
            check.paymentStatus === 'flagged' ||
            check.result.startsWith('flagged')
          ) {
            setStatus('flagged')
            return
          }
          if (check.result === 'expired' || check.paymentStatus === 'expired') {
            setStatus('expired')
            return
          }
          if (
            check.orderStatus === 'cancelled' ||
            check.orderStatus === 'rejected' ||
            check.orderStatus === 'refunded'
          ) {
            setStatus('cancelled')
            return
          }
          setStatus('expired')
        } catch {
          setStatus('expired')
        }
      } else {
        setErrorCode(code)
        setStatus('error')
      }
    }
  }, [context])

  useEffect(() => {
    if (!context || started.current) return
    started.current = true
    void requestQr()
  }, [context, requestQr])

  useEffect(() => {
    if (!payment || status !== 'ready') return

    const update = () => {
      setRemaining(
        Math.max(
          0,
          Math.ceil(
            (new Date(payment.expiresAt).getTime() - Date.now()) / 1000,
          ),
        ),
      )
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [payment, status])

  useEffect(() => {
    if (!context || !payment || status !== 'ready') return

    let active = true

    const apply = (result: PaymentCheck) => {
      if (!active) return

      if (result.result === 'paid' || result.paymentStatus === 'paid') {
        setStatus('paid')
        clearPaymentState(context.orderCode)
        return
      }

      if (
        result.paymentStatus === 'flagged' ||
        result.result.startsWith('flagged')
      ) {
        setStatus('flagged')
        return
      }

      if (result.result === 'expired' || result.paymentStatus === 'expired') {
        setStatus('expired')
        return
      }

      if (
        result.orderStatus === 'cancelled' ||
        result.orderStatus === 'rejected' ||
        result.orderStatus === 'refunded'
      ) {
        setStatus('cancelled')
        return
      }

      setCheckDelayed(false)
    }

    const check = async () => {
      if (checking.current) return
      checking.current = true

      try {
        const result = await verifyKhqrPayment(context.orderId)
        apply(result)
        if (active) setCheckDelayed(false)
      } catch {
        if (active) setCheckDelayed(true)
      } finally {
        checking.current = false
      }
    }

    const first = window.setTimeout(() => void check(), 2000)
    const interval = window.setInterval(() => void check(), 5000)

    return () => {
      active = false
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [context, payment, status])

  async function handleReopen() {
    if (!context || reopening) return

    setReopening(true)
    setErrorCode(null)

    try {
      try {
        await reopenExpiredOrder(context.orderCode, context.customerPhone)
      } catch (error) {
        if (errorCodeFrom(error) !== 'INVALID_STATE') throw error

        const check = await verifyKhqrPayment(context.orderId)
        if (check.result === 'paid' || check.paymentStatus === 'paid') {
          setStatus('paid')
          clearPaymentState(context.orderCode)
          return
        }
        if (
          check.paymentStatus === 'flagged' ||
          check.result.startsWith('flagged')
        ) {
          setStatus('flagged')
          return
        }

        await reopenExpiredOrder(context.orderCode, context.customerPhone)
      }

      const next = await generateKhqr(context.orderId)
      setPayment(next)
      setStatus('ready')
      setRemaining(
        Math.max(
          0,
          Math.ceil((new Date(next.expiresAt).getTime() - Date.now()) / 1000),
        ),
      )
    } catch (error) {
      setErrorCode(errorCodeFrom(error))
      setStatus('error')
    } finally {
      setReopening(false)
    }
  }

  if (!context) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <StoreIcon className="size-8" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('payment.missingTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('payment.missingText')}</p>
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

  const errorKey = errorCode ? paymentErrorKeys[errorCode] : undefined
  const errorMessage = errorKey
    ? t(errorKey)
    : errorCode
      ? getErrorMessage(errorCode, language)
      : t('payment.errorGeneric')
  const isExpired = status === 'expired' || remaining === 0
  const trackLink = `/track?code=${encodeURIComponent(context.orderCode)}`

  if (status === 'paid') {
    return (
      <section className="mx-auto max-w-lg">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-700/20">
            <CheckIcon className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
            {t('payment.paidTitle')}
          </h1>
          <p className="mt-2 text-sm text-emerald-800">
            {t('payment.paidText')}
          </p>
          <p className="mt-4 select-all break-all rounded-2xl bg-white/60 px-4 py-3 font-mono text-xl font-bold tracking-wider text-emerald-950">
            {context.orderCode}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to={trackLink}
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {t('order.track')}
            </Link>
            {context.invoice ? (
              <button
                type="button"
                onClick={() => downloadInvoice(context.invoice!, language, t)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
              >
                <DownloadIcon className="size-4" />
                {t('order.downloadInvoice')}
              </button>
            ) : null}
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              {t('order.continue')}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'flagged') {
    return (
      <section className="mx-auto max-w-lg">
        <div
          role="alert"
          className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-center shadow-sm sm:p-8"
        >
          <h1 className="text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl">
            {t('payment.flaggedTitle')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            {t('payment.flaggedText')}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to={trackLink}
              className="inline-flex items-center justify-center rounded-full bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
            >
              {t('order.track')}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'cancelled') {
    return (
      <section className="mx-auto max-w-lg">
        <div className="rounded-[2rem] border border-stone-200/80 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('payment.cancelledTitle')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('payment.cancelledText')}
          </p>
          <Link
            to={trackLink}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            {t('order.track')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white shadow-lg shadow-emerald-950/5">
        <div className="relative bg-ink p-6 text-center text-white sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 size-64 rounded-full bg-emerald-500/20 blur-3xl"
          />
          <p className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200/70 ring-1 ring-white/10">
            {context.storeName}
          </p>
          <h1 className="relative mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('payment.title')}
          </h1>
          <p className="relative mt-1 text-sm text-emerald-50/60">
            {t('payment.subtitle')}
          </p>

          <div className="relative mt-5 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/70">
              {t('payment.amount')}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-white">
              {formatMoney(payment?.amountCents ?? context.totalAmount)}
            </p>
            <p className="mt-1 select-all break-all font-mono text-sm text-emerald-50/60">
              {context.orderCode}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {status === 'loading' ? (
            <div className="mt-1 grid min-h-64 place-items-center rounded-3xl border border-dashed border-stone-200 bg-stone-50">
              <p className="text-sm font-medium text-slate-500">
                {t('payment.loadingQr')}
              </p>
            </div>
          ) : status === 'error' ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void requestQr()}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
              >
                {t('payment.tryAgain')}
              </button>
            </div>
          ) : (
            <>
              {payment ? (
                <KhqrCard
                  merchantName={context.storeName}
                  amount={payment.amountCents / 100}
                  currency="USD"
                  qrData={payment.qrString}
                  isExpired={isExpired}
                />
              ) : null}

              <div className="mt-4 text-center">
                {isExpired ? (
                  <p className="text-sm font-semibold text-red-700">
                    {t('payment.expiredTitle')}
                  </p>
                ) : (
                  <>
                    <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-800">
                      {t('payment.expiresIn')}{' '}
                      <span className="font-mono font-bold">
                        {formatCountdown(remaining)}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {t('payment.waiting')}
                    </p>
                  </>
                )}
              </div>

              {checkDelayed && !isExpired ? (
                <p className="mt-3 rounded-2xl bg-stone-50 p-2.5 text-center text-xs text-slate-500">
                  {t('payment.checkDelayed')}
                </p>
              ) : null}

              {errorCode && status === 'ready' ? (
                <p
                  role="alert"
                  className="mt-3 rounded-2xl bg-red-50 p-2.5 text-center text-xs text-red-700"
                >
                  {errorMessage}
                </p>
              ) : null}

              {isExpired ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-center">
                  <button
                    type="button"
                    onClick={() => void handleReopen()}
                    disabled={reopening}
                    className="inline-flex w-full items-center justify-center rounded-full bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reopening ? t('payment.reopening') : t('payment.newQr')}
                  </button>
                </div>
              ) : null}
            </>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-slate-500">
            <ShieldCheckIcon className="size-3.5 shrink-0 text-emerald-600" />
            {t('payment.saveCode')}
          </p>

          <div className="mt-5 text-center">
            <Link
              to={trackLink}
              className="inline-flex items-center justify-center rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              {t('order.track')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

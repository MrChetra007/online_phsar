import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  cancelCustomerOrder,
  confirmOrderReceived,
  reopenExpiredOrder,
  reportOrderProblem,
  trackOrder,
} from '../api/tracking'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { errorCodeFrom, getErrorMessage } from '../lib/errors'
import { useI18n, type Language } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { isValidKhmerPhone } from '../lib/phone'
import { provinceLabel } from '../lib/provinces'
import type { OrderStatus, PaymentStatus, TrackedOrder } from '../lib/tracking'
import type { TranslationKey } from '../lib/i18n/translations'

type LookupStatus = 'idle' | 'loading' | 'ready' | 'not_found' | 'error'

type Credentials = {
  code: string
  phone: string
}

type FormErrors = {
  code?: string
  phone?: string
}

type ConfirmAction = 'cancel' | 'confirm' | 'reopen'
type ActionDialog = ConfirmAction | 'report' | null
type ActionSuccess = ConfirmAction | 'report'

const orderStatusLabels: Record<OrderStatus, TranslationKey> = {
  pending: 'orderStatus.pending',
  confirmed: 'orderStatus.confirmed',
  rejected: 'orderStatus.rejected',
  cancelled: 'orderStatus.cancelled',
  shipped: 'orderStatus.shipped',
  delivered: 'orderStatus.delivered',
  completed: 'orderStatus.completed',
  paid_out: 'orderStatus.paidOut',
  refused: 'orderStatus.refused',
  returned: 'orderStatus.returned',
  refunded: 'orderStatus.refunded',
}

const orderStatusTones: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-stone-100 text-stone-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  shipped: 'bg-stone-100 text-stone-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700',
  paid_out: 'bg-emerald-50 text-emerald-700',
  refused: 'bg-red-50 text-red-700',
  returned: 'bg-amber-50 text-amber-700',
  refunded: 'bg-slate-100 text-slate-600',
}

const paymentStatusLabels: Record<PaymentStatus, TranslationKey> = {
  unpaid: 'paymentStatus.unpaid',
  paid: 'paymentStatus.paid',
  flagged: 'paymentStatus.flagged',
  expired: 'paymentStatus.expired',
  refund_due: 'paymentStatus.refundDue',
  refunded: 'paymentStatus.refunded',
}

const paymentStatusTones: Record<PaymentStatus, string> = {
  unpaid: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  flagged: 'bg-red-50 text-red-700',
  expired: 'bg-red-50 text-red-700',
  refund_due: 'bg-amber-50 text-amber-700',
  refunded: 'bg-slate-100 text-slate-600',
}

const actionSuccessLabels: Record<ActionSuccess, TranslationKey> = {
  cancel: 'tracking.actionSuccessCancel',
  confirm: 'tracking.actionSuccessConfirm',
  report: 'tracking.actionSuccessReport',
  reopen: 'tracking.actionSuccessReopen',
}

const negativeStatuses: OrderStatus[] = [
  'rejected',
  'cancelled',
  'refused',
  'returned',
  'refunded',
]

function formatDateTime(value: string, language: Language): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language === 'km' ? 'km-KH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  )
}

export function TrackingPage() {
  const { t, language } = useI18n()
  const [searchParams] = useSearchParams()
  const [values, setValues] = useState({
    code: (searchParams.get('code') ?? '').trim().toUpperCase(),
    phone: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<LookupStatus>('idle')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [query, setQuery] = useState<Credentials | null>(null)
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<ActionSuccess | null>(null)
  const [reportNote, setReportNote] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)

  async function loadOrder(
    credentials: Credentials,
    options: { silent?: boolean } = {},
  ) {
    if (!options.silent) {
      setStatus('loading')
      setOrder(null)
    }
    setErrorCode(null)

    try {
      const nextOrder = await trackOrder(credentials.code, credentials.phone)
      if (!nextOrder) {
        setOrder(null)
        setStatus('not_found')
        return
      }

      setOrder(nextOrder)
      setStatus('ready')
    } catch (error) {
      setOrder(null)
      setErrorCode(errorCodeFrom(error))
      setStatus('error')
    }
  }

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const code = values.code.trim().toUpperCase()
    const phone = values.phone.trim()
    const nextErrors: FormErrors = {}

    if (!code) nextErrors.code = t('tracking.errorCode')
    if (!isValidKhmerPhone(phone)) {
      nextErrors.phone = getErrorMessage('INVALID_PHONE', language)
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const credentials = { code, phone }
    setValues((current) => ({ ...current, code }))
    setQuery(credentials)
    setDialog(null)
    setActionError(null)
    setActionSuccess(null)
    setReportNote('')
    setReportError(null)
    void loadOrder(credentials)
  }

  function openDialog(next: Exclude<ActionDialog, null>) {
    setActionError(null)
    setActionSuccess(null)

    if (next === 'report') {
      setReportNote('')
      setReportError(null)
    }

    setDialog(next)
  }

  function closeDialog() {
    setDialog(null)
    setReportError(null)
  }

  async function runAction(action: ConfirmAction) {
    if (!query || actionLoading) return

    setActionLoading(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      if (action === 'cancel') {
        await cancelCustomerOrder(query.code, query.phone)
      } else if (action === 'confirm') {
        await confirmOrderReceived(query.code, query.phone)
      } else {
        await reopenExpiredOrder(query.code, query.phone)
      }

      setDialog(null)
      setActionSuccess(action)
      await loadOrder(query, { silent: true })
    } catch (error) {
      setActionError(errorCodeFrom(error))
      setDialog(null)
    } finally {
      setActionLoading(false)
    }
  }

  async function submitReport() {
    if (!query || actionLoading) return

    const note = reportNote.trim()
    if (note.length < 3 || note.length > 1000) {
      setReportError(t('tracking.reportError'))
      return
    }

    setActionLoading(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      await reportOrderProblem(query.code, query.phone, note)
      setDialog(null)
      setReportNote('')
      setReportError(null)
      setActionSuccess('report')
      await loadOrder(query, { silent: true })
    } catch (error) {
      const code = errorCodeFrom(error)

      if (code === 'INVALID_NOTE') {
        setReportError(getErrorMessage(code, language))
      } else {
        setActionError(code)
        setDialog(null)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const history =
    order && order.history.length > 0
      ? order.history
      : order
        ? [{ status: order.status, at: order.createdAt }]
        : []

  return (
    <section className="mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-lg shadow-emerald-950/10 sm:p-10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-24 size-80 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
            {t('nav.track')}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t('tracking.title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-emerald-50/60">
            {t('tracking.subtitle')}
          </p>

          <form
            noValidate
            onSubmit={handleLookup}
            className="mt-6 rounded-3xl bg-white p-4 text-slate-900 shadow-xl shadow-emerald-950/20 sm:p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('tracking.code')}
                value={values.code}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                  setErrors((current) => ({ ...current, code: undefined }))
                }}
                placeholder="DS-XXXXXXXXXX"
                error={errors.code}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={40}
                required
              />
              <Input
                label={t('tracking.phone')}
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                  setErrors((current) => ({ ...current, phone: undefined }))
                }}
                hint={t('tracking.phoneHint')}
                error={errors.phone}
                autoComplete="tel"
                maxLength={30}
                required
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
            >
              {status === 'loading'
                ? t('tracking.checking')
                : t('tracking.check')}
            </button>
          </form>
        </div>
      </div>

      {status === 'not_found' ? (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-stone-200/80 bg-white p-4 text-sm text-slate-700 shadow-sm"
        >
          {t('tracking.notFound')}
        </div>
      ) : null}

      {status === 'error' ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {getErrorMessage(errorCode, language)}
        </div>
      ) : null}

      {status === 'ready' && order ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-28">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {t('tracking.timeline')}
            </h2>
            <ol className="mt-4 space-y-4">
              {history.map((entry, index) => {
                const latest = index === history.length - 1
                const negative = negativeStatuses.includes(entry.status)

                return (
                  <li
                    key={`${entry.status}-${entry.at}`}
                    className="flex gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={[
                          'mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-white',
                          latest
                            ? negative
                              ? 'bg-red-500'
                              : 'bg-emerald-600'
                            : 'bg-slate-300',
                        ].join(' ')}
                      />
                      {!latest ? (
                        <span className="mt-1 w-px flex-1 bg-slate-200" />
                      ) : null}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p
                        className={
                          latest
                            ? 'text-sm font-semibold text-slate-900'
                            : 'text-sm text-slate-700'
                        }
                      >
                        {t(orderStatusLabels[entry.status])}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(entry.at, language)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </aside>

          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                    {order.storeName || t('tracking.store')}
                  </p>
                  <p className="mt-1 break-all font-mono text-xl font-bold tracking-tight text-slate-950">
                    {order.orderCode}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(order.createdAt, language)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={t(orderStatusLabels[order.status])}
                    tone={orderStatusTones[order.status]}
                  />
                  <StatusBadge
                    label={t(paymentStatusLabels[order.paymentStatus])}
                    tone={paymentStatusTones[order.paymentStatus]}
                  />
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-stone-100 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">
                    {t('tracking.paymentMethod')}
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {order.paymentMethod === 'cod'
                      ? t('order.paymentCod')
                      : t('order.paymentKhqr')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('checkout.province')}</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {provinceLabel(order.province, language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('tracking.total')}</dt>
                  <dd className="mt-0.5 text-base font-bold text-slate-900">
                    {formatMoney(order.totalAmount)}
                  </dd>
                </div>
                {order.deliveredAt ? (
                  <div>
                    <dt className="text-slate-500">
                      {t('tracking.deliveredAt')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {formatDateTime(order.deliveredAt, language)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('tracking.items')}
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {order.items.map((item, index) => (
                  <li
                    key={`${item.name}-${item.variant}-${index}`}
                    className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium text-slate-900">
                        {item.name}
                      </p>
                      {item.variant && item.variant !== 'Default' ? (
                        <p className="text-sm text-slate-500">{item.variant}</p>
                      ) : null}
                      <p className="text-sm text-slate-500">
                        Ã— {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">{t('checkout.subtotal')}</dt>
                  <dd className="font-medium text-slate-900">
                    {formatMoney(order.subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">{t('order.delivery')}</dt>
                  <dd className="font-medium text-slate-900">
                    {formatMoney(order.deliveryFee)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2 text-base">
                  <dt className="font-semibold text-slate-900">
                    {t('tracking.total')}
                  </dt>
                  <dd className="font-bold text-slate-900">
                    {formatMoney(order.totalAmount)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('tracking.deliveryTitle')}
              </h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{t('tracking.courier')}</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {order.courierName || t('tracking.notAvailable')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('checkout.province')}</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {provinceLabel(order.province, language)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">
                    {t('tracking.trackingNote')}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-line break-words font-medium text-slate-900">
                    {order.trackingNote || t('tracking.notAvailable')}
                  </dd>
                </div>
              </dl>
            </div>

            {actionError ||
            actionSuccess ||
            order.canCancel ||
            order.canReopen ||
            order.canConfirmReceived ||
            order.canReportProblem ? (
              <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t('tracking.actions')}
                </h2>

                {actionError ? (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {getErrorMessage(actionError, language)}
                  </div>
                ) : null}

                {actionSuccess ? (
                  <div
                    role="status"
                    className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                  >
                    {t(actionSuccessLabels[actionSuccess])}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {order.canConfirmReceived ? (
                    <Button
                      onClick={() => openDialog('confirm')}
                      disabled={actionLoading}
                    >
                      {t('tracking.confirmReceived')}
                    </Button>
                  ) : null}
                  {order.canReopen ? (
                    <Button
                      onClick={() => openDialog('reopen')}
                      disabled={actionLoading}
                    >
                      {t('tracking.reopenOrder')}
                    </Button>
                  ) : null}
                  {order.canReportProblem ? (
                    <Button
                      variant="secondary"
                      onClick={() => openDialog('report')}
                      disabled={actionLoading}
                    >
                      {t('tracking.reportProblem')}
                    </Button>
                  ) : null}
                  {order.canCancel ? (
                    <Button
                      variant="danger"
                      onClick={() => openDialog('cancel')}
                      disabled={actionLoading}
                    >
                      {t('tracking.cancelOrder')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link to="/" className="font-medium text-emerald-700 hover:underline">
          {t('common.backHome')}
        </Link>
      </p>

      {dialog === 'cancel' ? (
        <ConfirmDialog
          title={t('tracking.cancelTitle')}
          confirmLabel={t('tracking.cancelConfirm')}
          cancelLabel={t('tracking.keepOrder')}
          onConfirm={() => void runAction('cancel')}
          onCancel={closeDialog}
          danger
          confirmDisabled={actionLoading}
        >
          <p>{t('tracking.cancelText')}</p>
        </ConfirmDialog>
      ) : null}

      {dialog === 'confirm' ? (
        <ConfirmDialog
          title={t('tracking.confirmTitle')}
          confirmLabel={t('tracking.confirmConfirm')}
          cancelLabel={t('tracking.notYet')}
          onConfirm={() => void runAction('confirm')}
          onCancel={closeDialog}
          confirmDisabled={actionLoading}
        >
          <p>{t('tracking.confirmText')}</p>
        </ConfirmDialog>
      ) : null}

      {dialog === 'reopen' ? (
        <ConfirmDialog
          title={t('tracking.reopenTitle')}
          confirmLabel={t('tracking.reopenConfirm')}
          cancelLabel={t('tracking.keepClosed')}
          onConfirm={() => void runAction('reopen')}
          onCancel={closeDialog}
          confirmDisabled={actionLoading}
        >
          <p>{t('tracking.reopenText')}</p>
        </ConfirmDialog>
      ) : null}

      {dialog === 'report' ? (
        <ConfirmDialog
          title={t('tracking.reportTitle')}
          confirmLabel={t('tracking.reportConfirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submitReport()}
          onCancel={closeDialog}
          confirmDisabled={actionLoading}
        >
          <p>{t('tracking.reportText')}</p>
          <div className="mt-3">
            <Textarea
              label={t('tracking.reportLabel')}
              value={reportNote}
              onChange={(event) => {
                setReportNote(event.target.value)
                setReportError(null)
              }}
              hint={t('tracking.reportHint')}
              error={reportError ?? undefined}
              rows={4}
              maxLength={1000}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

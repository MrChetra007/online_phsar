import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  changeAdminOrderStatus,
  confirmPaymentManually,
  getAdminOrder,
  markPaymentRefunded,
  resolveAdminDispute,
  type AdminOrder,
  type AdminOrderStatus,
} from '../../api/admin'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/OrderStatusBadge'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { formatDateTime } from '../../lib/datetime'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { formatMoney } from '../../lib/money'
import { orderStatusLabels } from '../../lib/orderStatus'

const adminTransitions: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['shipped', 'rejected', 'cancelled'],
  shipped: ['delivered', 'refused'],
  refused: ['returned'],
  delivered: ['returned', 'completed', 'refunded'],
  returned: ['refunded'],
  rejected: [],
  cancelled: [],
  completed: [],
  paid_out: [],
  refunded: [],
}

type PaymentDialog = 'confirm' | 'refund'

export function AdminOrderDetailPage() {
  const { t, language } = useI18n()
  const { orderId } = useParams()

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [version, setVersion] = useState(0)

  const [newStatus, setNewStatus] = useState<'' | AdminOrderStatus>('')
  const [note, setNote] = useState('')
  const [courierName, setCourierName] = useState('')
  const [trackingNote, setTrackingNote] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)

  const [paymentDialog, setPaymentDialog] = useState<PaymentDialog | null>(null)
  const [confirmNote, setConfirmNote] = useState('')
  const [refundReference, setRefundReference] = useState('')
  const [refundNote, setRefundNote] = useState('')
  const [paymentFieldError, setPaymentFieldError] = useState<string | null>(
    null,
  )
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentBusy, setPaymentBusy] = useState(false)

  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeNote, setDisputeNote] = useState('')
  const [disputeFieldError, setDisputeFieldError] = useState<string | null>(
    null,
  )
  const [disputeError, setDisputeError] = useState<string | null>(null)
  const [disputeBusy, setDisputeBusy] = useState(false)

  const [notice, setNotice] = useState<TranslationKey | null>(null)

  useEffect(() => {
    if (!orderId) return

    let active = true

    void getAdminOrder(orderId)
      .then((next) => {
        if (!active) return
        if (!next) {
          setOrder(null)
          setNotFound(true)
          return
        }
        setOrder(next)
        setCourierName(next.courierName ?? '')
        setTrackingNote(next.trackingNote ?? '')
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
  }, [orderId, version])

  async function refreshOrder(id: string) {
    const next = await getAdminOrder(id)
    if (!next) {
      setNotFound(true)
      return
    }
    setOrder(next)
  }

  async function submitStatus() {
    if (!order || statusBusy) return

    if (!newStatus) {
      setStatusError(t('admin.selectStatus'))
      return
    }
    if (note.trim() === '') {
      setStatusError(t('admin.noteRequired'))
      return
    }

    setStatusBusy(true)
    setStatusError(null)
    setNotice(null)

    try {
      await changeAdminOrderStatus(order.id, newStatus, {
        note,
        courierName,
        trackingNote,
      })
      setNotice('admin.statusUpdated')
      setNewStatus('')
      setNote('')
      await refreshOrder(order.id)
    } catch (error) {
      setStatusError(getErrorMessage(errorCodeFrom(error), language))
    } finally {
      setStatusBusy(false)
    }
  }

  function openPaymentDialog(kind: PaymentDialog) {
    setPaymentDialog(kind)
    setConfirmNote('')
    setRefundReference('')
    setRefundNote('')
    setPaymentFieldError(null)
    setPaymentError(null)
  }

  function closePaymentDialog() {
    if (paymentBusy) return
    setPaymentDialog(null)
    setPaymentFieldError(null)
    setPaymentError(null)
  }

  async function submitPayment() {
    if (!order || !paymentDialog || paymentBusy) return

    if (paymentDialog === 'confirm' && confirmNote.trim() === '') {
      setPaymentFieldError(t('admin.noteRequired'))
      return
    }
    if (paymentDialog === 'refund' && refundReference.trim() === '') {
      setPaymentFieldError(t('admin.refundReferenceRequired'))
      return
    }

    setPaymentBusy(true)
    setPaymentFieldError(null)
    setPaymentError(null)
    setNotice(null)

    try {
      if (paymentDialog === 'confirm') {
        await confirmPaymentManually(order.id, confirmNote)
        setNotice('admin.paymentConfirmed')
      } else {
        await markPaymentRefunded(order.id, refundReference, refundNote)
        setNotice('admin.refundDone')
      }
      setPaymentDialog(null)
      await refreshOrder(order.id)
    } catch (error) {
      setPaymentError(errorCodeFrom(error))
    } finally {
      setPaymentBusy(false)
    }
  }

  function openDispute() {
    setDisputeOpen(true)
    setDisputeNote('')
    setDisputeFieldError(null)
    setDisputeError(null)
  }

  function closeDispute() {
    if (disputeBusy) return
    setDisputeOpen(false)
    setDisputeFieldError(null)
    setDisputeError(null)
  }

  async function submitDispute() {
    if (!order || disputeBusy) return

    if (disputeNote.trim() === '') {
      setDisputeFieldError(t('admin.noteRequired'))
      return
    }

    setDisputeBusy(true)
    setDisputeFieldError(null)
    setDisputeError(null)
    setNotice(null)

    try {
      await resolveAdminDispute(order.id, disputeNote)
      setDisputeOpen(false)
      setNotice('admin.disputeResolved')
      await refreshOrder(order.id)
    } catch (error) {
      setDisputeError(errorCodeFrom(error))
    } finally {
      setDisputeBusy(false)
    }
  }

  if (!orderId) {
    return <ErrorState />
  }

  if (loading) return <LoadingState label={t('storeOrders.loadingOrder')} />

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

  if (notFound || !order) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.orderNotFound')}
        </p>
        <Link
          to="/admin/orders"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          {t('admin.backToOrders')}
        </Link>
      </section>
    )
  }

  const availableStatuses = adminTransitions[order.status]
  const canConfirmPayment = order.paymentStatus === 'flagged'
  const canRefund =
    order.paymentStatus === 'flagged' || order.paymentStatus === 'refund_due'
  const history =
    order.history.length > 0
      ? order.history
      : [
          {
            id: 'current',
            oldStatus: null,
            newStatus: order.status,
            note: null,
            createdAt: order.createdAt,
          },
        ]

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/admin/orders"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            {t('admin.backToOrders')}
          </Link>
          <p className="mt-2 break-all font-mono text-xl font-bold text-slate-900">
            {order.orderCode}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {order.storeName} · {formatDateTime(order.createdAt, language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {order.hasOpenDispute ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t('admin.disputeOpen')}</p>
          {order.problemNote ? (
            <p className="mt-1 whitespace-pre-line break-words">
              {order.problemNote}
            </p>
          ) : null}
          {order.problemReportedAt ? (
            <p className="mt-1 text-xs text-amber-800">
              {t('admin.problemReportedAt')}:{' '}
              {formatDateTime(order.problemReportedAt, language)}
            </p>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
        >
          {t(notice)}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            {t('storeOrders.history')}
          </h2>
          <ol className="mt-4 space-y-4">
            {history.map((entry, index) => {
              const latest = index === history.length - 1

              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={[
                        'mt-1 size-2.5 shrink-0 rounded-full',
                        latest ? 'bg-emerald-600' : 'bg-slate-300',
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
                      {t(orderStatusLabels[entry.newStatus])}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(entry.createdAt, language)}
                    </p>
                    {entry.note ? (
                      <p className="mt-1 whitespace-pre-line break-words text-xs text-slate-600">
                        {entry.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </aside>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('admin.customerInfo')}
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{t('admin.store')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.storeName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('storeOrders.customer')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.customerName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('storeOrders.phone')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="hover:underline"
                  >
                    {order.customerPhone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('storeOrders.province')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.province}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">{t('storeOrders.address')}</dt>
                <dd className="mt-0.5 whitespace-pre-line break-words font-medium text-slate-900">
                  {order.address}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('storeOrders.payment')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.paymentMethod === 'cod'
                    ? t('order.paymentCod')
                    : t('order.paymentKhqr')}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {t('admin.paymentReference')}
                </dt>
                <dd className="mt-0.5 break-all font-medium text-slate-900">
                  {order.paymentReference || t('storeOrders.notAvailable')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('storeOrders.items')}
            </h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-900">
                      {item.name}
                    </p>
                    {item.variant ? (
                      <p className="text-sm text-slate-500">{item.variant}</p>
                    ) : null}
                    <p className="text-sm text-slate-500">× {item.quantity}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-900">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">{t('storeOrders.subtotal')}</dt>
                <dd className="font-medium text-slate-900">
                  {formatMoney(order.subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">
                  {t('storeOrders.deliveryFee')}
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatMoney(order.deliveryFee)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">
                  {t('storeOrders.commission')} ({order.commissionPercent}%)
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatMoney(order.commissionAmount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-base">
                <dt className="font-semibold text-slate-900">
                  {t('storeOrders.total')}
                </dt>
                <dd className="font-bold text-slate-900">
                  {formatMoney(order.totalAmount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">{t('storeOrders.payout')}</dt>
                <dd className="font-semibold text-emerald-700">
                  {formatMoney(order.storePayoutAmount)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('admin.delivery')}
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{t('storeOrders.courier')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.courierName || t('storeOrders.notAvailable')}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {t('storeOrders.trackingNote')}
                </dt>
                <dd className="mt-0.5 whitespace-pre-line break-words font-medium text-slate-900">
                  {order.trackingNote || t('storeOrders.notAvailable')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('admin.changeStatus')}
            </h2>

            {availableStatuses.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('admin.noTransitions')}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <Select
                  label={t('admin.newStatus')}
                  value={newStatus}
                  onChange={(event) => {
                    setNewStatus(event.target.value as '' | AdminOrderStatus)
                    setStatusError(null)
                  }}
                  disabled={statusBusy}
                >
                  <option value="">{t('admin.selectStatus')}</option>
                  {availableStatuses.map((entry) => (
                    <option key={entry} value={entry}>
                      {t(orderStatusLabels[entry])}
                    </option>
                  ))}
                </Select>

                {newStatus === 'shipped' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={t('admin.courierLabel')}
                      value={courierName}
                      onChange={(event) => setCourierName(event.target.value)}
                      maxLength={100}
                    />
                    <Input
                      label={t('admin.trackingNoteLabel')}
                      value={trackingNote}
                      onChange={(event) => setTrackingNote(event.target.value)}
                      maxLength={500}
                    />
                  </div>
                ) : null}

                <Textarea
                  label={t('admin.note')}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value)
                    setStatusError(null)
                  }}
                  hint={t('admin.noteHint')}
                  rows={2}
                  maxLength={1000}
                />

                {statusError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {statusError}
                  </p>
                ) : null}

                <Button
                  onClick={() => void submitStatus()}
                  disabled={statusBusy}
                >
                  {statusBusy
                    ? t('storeOrders.saving')
                    : t('admin.updateStatus')}
                </Button>
              </div>
            )}
          </div>

          {canConfirmPayment || canRefund ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('admin.paymentActions')}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {canConfirmPayment ? (
                  <Button onClick={() => openPaymentDialog('confirm')}>
                    {t('admin.confirmPayment')}
                  </Button>
                ) : null}
                {canRefund ? (
                  <Button
                    variant="secondary"
                    onClick={() => openPaymentDialog('refund')}
                  >
                    {t('admin.refundPayment')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {order.hasOpenDispute ? (
            <div className="rounded-2xl border border-amber-200 bg-white p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('admin.disputeOpen')}
              </h2>
              {order.problemNote ? (
                <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">
                  {order.problemNote}
                </p>
              ) : null}
              <Button
                className="mt-3"
                variant="secondary"
                onClick={openDispute}
              >
                {t('admin.resolveDispute')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {paymentDialog ? (
        <ConfirmDialog
          title={
            paymentDialog === 'confirm'
              ? t('admin.confirmPaymentTitle')
              : t('admin.refundTitle')
          }
          confirmLabel={
            paymentBusy
              ? t('storeOrders.saving')
              : paymentDialog === 'confirm'
                ? t('admin.confirmPayment')
                : t('admin.refundPayment')
          }
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submitPayment()}
          onCancel={closePaymentDialog}
          danger={paymentDialog === 'refund'}
          confirmDisabled={paymentBusy}
        >
          <p>
            {paymentDialog === 'confirm'
              ? t('admin.confirmPaymentText')
              : t('admin.refundText')}
          </p>

          {paymentError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getErrorMessage(paymentError, language)}
            </p>
          ) : null}

          {paymentDialog === 'refund' ? (
            <div className="mt-3 space-y-3">
              <Input
                label={t('admin.refundReference')}
                value={refundReference}
                onChange={(event) => {
                  setRefundReference(event.target.value)
                  setPaymentFieldError(null)
                }}
                error={paymentFieldError ?? undefined}
                maxLength={200}
              />
              <Textarea
                label={t('admin.note')}
                value={refundNote}
                onChange={(event) => setRefundNote(event.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>
          ) : (
            <div className="mt-3">
              <Textarea
                label={t('admin.note')}
                value={confirmNote}
                onChange={(event) => {
                  setConfirmNote(event.target.value)
                  setPaymentFieldError(null)
                }}
                hint={t('admin.noteHint')}
                error={paymentFieldError ?? undefined}
                rows={2}
                maxLength={1000}
              />
            </div>
          )}
        </ConfirmDialog>
      ) : null}

      {disputeOpen ? (
        <ConfirmDialog
          title={t('admin.resolveDisputeTitle')}
          confirmLabel={
            disputeBusy ? t('storeOrders.saving') : t('admin.resolveDispute')
          }
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submitDispute()}
          onCancel={closeDispute}
          confirmDisabled={disputeBusy}
        >
          <p>{t('admin.resolveDisputeText')}</p>

          {disputeError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getErrorMessage(disputeError, language)}
            </p>
          ) : null}

          <div className="mt-3">
            <Textarea
              label={t('admin.note')}
              value={disputeNote}
              onChange={(event) => {
                setDisputeNote(event.target.value)
                setDisputeFieldError(null)
              }}
              hint={t('admin.noteHint')}
              error={disputeFieldError ?? undefined}
              rows={3}
              maxLength={1000}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  confirmPaymentManually,
  listPaymentIssues,
  markPaymentRefunded,
  type AdminOrder,
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
import { Textarea } from '../../components/Textarea'
import { formatDateTime } from '../../lib/datetime'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { formatMoney } from '../../lib/money'

type PaymentDialog = {
  kind: 'confirm' | 'refund'
  order: AdminOrder
}

export function AdminPaymentsPage() {
  const { t, language } = useI18n()

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  const [dialog, setDialog] = useState<PaymentDialog | null>(null)
  const [note, setNote] = useState('')
  const [reference, setReference] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<TranslationKey | null>(null)

  useEffect(() => {
    let active = true

    void listPaymentIssues()
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
  }, [version])

  function openDialog(kind: 'confirm' | 'refund', order: AdminOrder) {
    setDialog({ kind, order })
    setNote('')
    setReference('')
    setFieldError(null)
    setActionError(null)
    setNotice(null)
  }

  function closeDialog() {
    if (busy) return
    setDialog(null)
    setFieldError(null)
    setActionError(null)
  }

  async function submit() {
    if (!dialog || busy) return

    if (dialog.kind === 'confirm' && note.trim() === '') {
      setFieldError(t('admin.noteRequired'))
      return
    }
    if (dialog.kind === 'refund' && reference.trim() === '') {
      setFieldError(t('admin.refundReferenceRequired'))
      return
    }

    setBusy(true)
    setFieldError(null)
    setActionError(null)

    try {
      if (dialog.kind === 'confirm') {
        await confirmPaymentManually(dialog.order.id, note)
        setNotice('admin.paymentConfirmed')
      } else {
        await markPaymentRefunded(dialog.order.id, reference, note)
        setNotice('admin.refundDone')
      }
      setDialog(null)
      setVersion((current) => current + 1)
    } catch (error) {
      setActionError(errorCodeFrom(error))
    } finally {
      setBusy(false)
    }
  }

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
        {t('admin.paymentsTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('admin.paymentsSubtitle')}
      </p>
      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
        >
          {t(notice)}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.noPayments')}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="break-all font-mono text-sm font-bold text-slate-900 hover:underline"
                  >
                    {order.orderCode}
                  </Link>
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
                  {formatMoney(order.totalAmount)}
                  {order.paymentReference ? ` · ${order.paymentReference}` : ''}
                </span>
                <div className="flex flex-wrap gap-2">
                  {order.paymentStatus === 'flagged' ? (
                    <Button
                      size="sm"
                      onClick={() => openDialog('confirm', order)}
                    >
                      {t('admin.confirmPayment')}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openDialog('refund', order)}
                  >
                    {t('admin.refundPayment')}
                  </Button>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    {t('admin.viewOrder')}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog ? (
        <ConfirmDialog
          title={
            dialog.kind === 'confirm'
              ? t('admin.confirmPaymentTitle')
              : t('admin.refundTitle')
          }
          confirmLabel={
            busy
              ? t('storeOrders.saving')
              : dialog.kind === 'confirm'
                ? t('admin.confirmPayment')
                : t('admin.refundPayment')
          }
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submit()}
          onCancel={closeDialog}
          danger={dialog.kind === 'refund'}
          confirmDisabled={busy}
        >
          <p>
            {dialog.kind === 'confirm'
              ? t('admin.confirmPaymentText')
              : t('admin.refundText')}
          </p>

          {actionError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getErrorMessage(actionError, language)}
            </p>
          ) : null}

          {dialog.kind === 'refund' ? (
            <div className="mt-3 space-y-3">
              <Input
                label={t('admin.refundReference')}
                value={reference}
                onChange={(event) => {
                  setReference(event.target.value)
                  setFieldError(null)
                }}
                error={fieldError ?? undefined}
                maxLength={200}
              />
              <Textarea
                label={t('admin.note')}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>
          ) : (
            <div className="mt-3">
              <Textarea
                label={t('admin.note')}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setFieldError(null)
                }}
                hint={t('admin.noteHint')}
                error={fieldError ?? undefined}
                rows={2}
                maxLength={1000}
              />
            </div>
          )}
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

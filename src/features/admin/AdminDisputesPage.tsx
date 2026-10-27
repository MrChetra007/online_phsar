import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listOpenDisputes,
  resolveAdminDispute,
  type AdminOrder,
} from '../../api/admin'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/OrderStatusBadge'
import { Textarea } from '../../components/Textarea'
import { formatDateTime } from '../../lib/datetime'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import { formatMoney } from '../../lib/money'
import { useToast } from '../toast'

export function AdminDisputesPage() {
  const { t, language } = useI18n()
  const { showToast } = useToast()

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [note, setNote] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    void listOpenDisputes()
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

  function openDialog(order: AdminOrder) {
    setSelected(order)
    setNote('')
    setFieldError(null)
    setActionError(null)
  }

  function closeDialog() {
    if (busy) return
    setSelected(null)
    setFieldError(null)
    setActionError(null)
  }

  async function submit() {
    if (!selected || busy) return

    if (note.trim() === '') {
      setFieldError(t('admin.noteRequired'))
      return
    }

    setBusy(true)
    setFieldError(null)
    setActionError(null)

    try {
      await resolveAdminDispute(selected.id, note)
      setSelected(null)
      showToast(t('admin.disputeResolved'), { tone: 'success' })
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
        {t('admin.disputesTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('admin.disputesSubtitle')}
      </p>
      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.noDisputes')}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"
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
                  {order.problemReportedAt ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t('admin.problemReportedAt')}:{' '}
                      {formatDateTime(order.problemReportedAt, language)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
              </div>

              {order.problemNote ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm whitespace-pre-line break-words text-amber-900">
                  {order.problemNote}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                <span className="font-semibold text-slate-900">
                  {formatMoney(order.totalAmount)}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openDialog(order)}
                  >
                    {t('admin.resolveDispute')}
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

      {selected ? (
        <ConfirmDialog
          title={t('admin.resolveDisputeTitle')}
          confirmLabel={
            busy ? t('storeOrders.saving') : t('admin.resolveDispute')
          }
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submit()}
          onCancel={closeDialog}
          confirmDisabled={busy}
        >
          <p>{t('admin.resolveDisputeText')}</p>

          {actionError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getErrorMessage(actionError, language)}
            </p>
          ) : null}

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
              rows={3}
              maxLength={1000}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

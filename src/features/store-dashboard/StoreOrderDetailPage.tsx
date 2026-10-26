import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  changeStoreOrderStatus,
  getStoreOrder,
  restockStoreOrder,
  type StoreOrder,
  type StoreOrderStatus,
} from '../../api/storeOrders'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { Textarea } from '../../components/Textarea'
import { formatDateTime } from '../../lib/datetime'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { formatMoney } from '../../lib/money'
import { orderStatusLabels } from '../../lib/orderStatus'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../components/OrderStatusBadge'

type StatusActionId =
  'confirm' | 'reject' | 'ship' | 'deliver' | 'refuse' | 'return'

type StatusAction = {
  id: StatusActionId
  target: StoreOrderStatus
  labelKey: TranslationKey
  titleKey: TranslationKey
  textKey: TranslationKey
  danger?: boolean
  requiresCourier?: boolean
}

const actions: Record<StatusActionId, StatusAction> = {
  confirm: {
    id: 'confirm',
    target: 'confirmed',
    labelKey: 'storeOrders.confirm',
    titleKey: 'storeOrders.confirmTitle',
    textKey: 'storeOrders.confirmText',
  },
  reject: {
    id: 'reject',
    target: 'rejected',
    labelKey: 'storeOrders.reject',
    titleKey: 'storeOrders.rejectTitle',
    textKey: 'storeOrders.rejectText',
    danger: true,
  },
  ship: {
    id: 'ship',
    target: 'shipped',
    labelKey: 'storeOrders.ship',
    titleKey: 'storeOrders.shipTitle',
    textKey: 'storeOrders.shipText',
    requiresCourier: true,
  },
  deliver: {
    id: 'deliver',
    target: 'delivered',
    labelKey: 'storeOrders.deliver',
    titleKey: 'storeOrders.deliverTitle',
    textKey: 'storeOrders.deliverText',
  },
  refuse: {
    id: 'refuse',
    target: 'refused',
    labelKey: 'storeOrders.refuse',
    titleKey: 'storeOrders.refuseTitle',
    textKey: 'storeOrders.refuseText',
    danger: true,
  },
  return: {
    id: 'return',
    target: 'returned',
    labelKey: 'storeOrders.return',
    titleKey: 'storeOrders.returnTitle',
    textKey: 'storeOrders.returnText',
  },
}

function actionsFor(status: StoreOrderStatus): StatusAction[] {
  switch (status) {
    case 'pending':
      return [actions.confirm, actions.reject]
    case 'confirmed':
      return [actions.ship, actions.reject]
    case 'shipped':
      return [actions.deliver, actions.refuse]
    case 'refused':
      return [actions.return]
    case 'delivered':
      return [actions.return]
    default:
      return []
  }
}

export function StoreOrderDetailPage() {
  const { t, language } = useI18n()
  const { orderId } = useParams()

  const [order, setOrder] = useState<StoreOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [version, setVersion] = useState(0)

  const [action, setAction] = useState<StatusAction | null>(null)
  const [note, setNote] = useState('')
  const [courierName, setCourierName] = useState('')
  const [trackingNote, setTrackingNote] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<TranslationKey | null>(null)

  const [restockOpen, setRestockOpen] = useState(false)
  const [restockBusy, setRestockBusy] = useState(false)
  const [restockError, setRestockError] = useState<string | null>(null)
  const [restockNotice, setRestockNotice] = useState(false)

  useEffect(() => {
    if (!orderId) return

    let active = true

    void getStoreOrder(orderId)
      .then((next) => {
        if (!active) return
        if (!next) {
          setOrder(null)
          setNotFound(true)
          return
        }
        setOrder(next)
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
    try {
      const next = await getStoreOrder(id)
      setOrder(next)
      if (!next) setNotFound(true)
    } catch {
      setFailed(true)
    }
  }

  function openAction(next: StatusAction) {
    setAction(next)
    setNote('')
    setCourierName(order?.courierName ?? '')
    setTrackingNote(order?.trackingNote ?? '')
    setFieldError(null)
    setDialogError(null)
  }

  function closeAction() {
    if (busy) return
    setAction(null)
    setFieldError(null)
    setDialogError(null)
  }

  async function submitAction() {
    if (!order || !action || busy) return

    if (action.requiresCourier && courierName.trim() === '') {
      setFieldError(t('storeOrders.courierRequired'))
      return
    }

    setBusy(true)
    setDialogError(null)
    setFieldError(null)
    setNotice(null)

    try {
      await changeStoreOrderStatus(order.id, action.target, {
        note,
        courierName,
        trackingNote,
      })
      setAction(null)
      setNotice('storeOrders.actionSuccess')
      await refreshOrder(order.id)
    } catch (error) {
      setDialogError(errorCodeFrom(error))
    } finally {
      setBusy(false)
    }
  }

  async function submitRestock() {
    if (!order || restockBusy) return

    setRestockBusy(true)
    setRestockError(null)
    setNotice(null)

    try {
      await restockStoreOrder(order.id)
      setRestockOpen(false)
      setRestockNotice(true)
      await refreshOrder(order.id)
    } catch (error) {
      setRestockError(errorCodeFrom(error))
      setRestockOpen(false)
    } finally {
      setRestockBusy(false)
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
          {t('storeOrders.notFound')}
        </p>
        <Link
          to="/store/orders"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          {t('storeOrders.backToOrders')}
        </Link>
      </section>
    )
  }

  const availableActions = actionsFor(order.status)
  const canRestock =
    (order.status === 'returned' || order.status === 'refunded') &&
    !order.stockReleased
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
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/store/orders"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            {t('storeOrders.backToOrders')}
          </Link>
          <p className="mt-2 break-all font-mono text-xl font-bold text-slate-900">
            {order.orderCode}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(order.createdAt, language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {order.hasOpenDispute ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('storeOrders.dispute')}
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
              {t('storeOrders.customer')}
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
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
              <div className="sm:col-span-2">
                <dt className="text-slate-500">{t('storeOrders.address')}</dt>
                <dd className="mt-0.5 whitespace-pre-line break-words font-medium text-slate-900">
                  {order.address}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('storeOrders.province')}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {order.province}
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
              {t('order.delivery')}
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
              {t('storeOrders.actions')}
            </h2>

            {restockError ? (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {getErrorMessage(restockError, language)}
              </div>
            ) : null}

            {restockNotice ? (
              <p
                role="status"
                className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                {t('storeOrders.restocked')}
              </p>
            ) : null}

            {availableActions.length === 0 && !canRestock ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('storeOrders.noActions')}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableActions.map((entry) => (
                  <Button
                    key={entry.id}
                    variant={entry.danger ? 'danger' : 'primary'}
                    onClick={() => openAction(entry)}
                    disabled={busy || restockBusy}
                  >
                    {t(entry.labelKey)}
                  </Button>
                ))}
                {canRestock ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRestockError(null)
                      setRestockOpen(true)
                    }}
                    disabled={busy || restockBusy}
                  >
                    {t('storeOrders.restock')}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {action ? (
        <ConfirmDialog
          title={t(action.titleKey)}
          confirmLabel={busy ? t('storeOrders.saving') : t(action.labelKey)}
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submitAction()}
          onCancel={closeAction}
          danger={action.danger}
          confirmDisabled={busy}
        >
          <p>{t(action.textKey)}</p>
          {action.id === 'deliver' && order.paymentMethod === 'cod' ? (
            <p className="mt-2 font-medium text-slate-700">
              {t('storeOrders.deliverCodText')}
            </p>
          ) : null}

          {dialogError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getErrorMessage(dialogError, language)}
            </p>
          ) : null}

          {action.requiresCourier ? (
            <div className="mt-3 space-y-3">
              <Input
                label={t('storeOrders.courierLabel')}
                value={courierName}
                onChange={(event) => {
                  setCourierName(event.target.value)
                  setFieldError(null)
                }}
                hint={t('storeOrders.courierHint')}
                error={fieldError ?? undefined}
                maxLength={100}
              />
              <Textarea
                label={t('storeOrders.trackingNoteLabel')}
                value={trackingNote}
                onChange={(event) => setTrackingNote(event.target.value)}
                hint={t('storeOrders.trackingNoteHint')}
                rows={2}
                maxLength={500}
              />
            </div>
          ) : null}

          <div className="mt-3">
            <Textarea
              label={t('storeOrders.noteLabel')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              hint={t('storeOrders.noteHint')}
              rows={2}
              maxLength={1000}
            />
          </div>
        </ConfirmDialog>
      ) : null}

      {restockOpen ? (
        <ConfirmDialog
          title={t('storeOrders.restockTitle')}
          confirmLabel={
            restockBusy ? t('storeOrders.saving') : t('storeOrders.restock')
          }
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submitRestock()}
          onCancel={() => {
            if (!restockBusy) setRestockOpen(false)
          }}
          confirmDisabled={restockBusy}
        >
          <p>{t('storeOrders.restockText')}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

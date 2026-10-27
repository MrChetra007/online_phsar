import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createSettlement,
  listSettlementSummaries,
  listStoreSettlementData,
  recordCommissionSettled,
  recordDeduction,
  type EligibleOrder,
  type SettlementOrderChoice,
  type SettlementResult,
  type SettlementSummary,
} from '../../api/settlement'
import type { StoreLedgerEntry, StoreSettlement } from '../../api/statement'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import { formatDateTime } from '../../lib/datetime'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { ledgerTypeLabels } from '../../lib/ledger'
import { formatMoney, parseMoneyToCents } from '../../lib/money'
import { orderStatusLabels } from '../../lib/orderStatus'
import { useToast } from '../toast'

type StoreDetail = {
  eligibleOrders: EligibleOrder[]
  ledger: StoreLedgerEntry[]
  settlements: StoreSettlement[]
  orderChoices: SettlementOrderChoice[]
}

type TransferErrors = {
  amount?: string
  reference?: string
}

type DeductionErrors = {
  order?: string
  amount?: string
  note?: string
}

function amountTone(amount: number): string {
  if (amount > 0) return 'text-emerald-700'
  if (amount < 0) return 'text-red-700'
  return 'text-slate-700'
}

function paymentLabelKey(
  method: EligibleOrder['paymentMethod'],
): TranslationKey {
  return method === 'cod' ? 'order.paymentCod' : 'order.paymentKhqr'
}

export function AdminSettlementsPage() {
  const { t, language } = useI18n()
  const { showToast } = useToast()

  const [summaries, setSummaries] = useState<SettlementSummary[]>([])
  const [summariesLoading, setSummariesLoading] = useState(true)
  const [summariesFailed, setSummariesFailed] = useState(false)
  const [version, setVersion] = useState(0)

  const [selected, setSelected] = useState<{
    id: string
    name: string
  } | null>(null)
  const [detail, setDetail] = useState<StoreDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailFailed, setDetailFailed] = useState(false)

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  const [settlementOpen, setSettlementOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [settlementNote, setSettlementNote] = useState('')
  const [settlementFieldError, setSettlementFieldError] = useState<
    string | null
  >(null)
  const [settlementActionError, setSettlementActionError] = useState<
    string | null
  >(null)
  const [settlementBusy, setSettlementBusy] = useState(false)
  const [settlementResult, setSettlementResult] =
    useState<SettlementResult | null>(null)

  const [transferAmount, setTransferAmount] = useState('')
  const [transferReference, setTransferReference] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [transferErrors, setTransferErrors] = useState<TransferErrors>({})
  const [transferActionError, setTransferActionError] = useState<string | null>(
    null,
  )
  const [transferBusy, setTransferBusy] = useState(false)

  const [deductionOrderId, setDeductionOrderId] = useState('')
  const [deductionAmount, setDeductionAmount] = useState('')
  const [deductionNote, setDeductionNote] = useState('')
  const [deductionErrors, setDeductionErrors] = useState<DeductionErrors>({})
  const [deductionActionError, setDeductionActionError] = useState<
    string | null
  >(null)
  const [deductionBusy, setDeductionBusy] = useState(false)

  useEffect(() => {
    let active = true

    void listSettlementSummaries()
      .then((next) => {
        if (!active) return
        setSummariesFailed(false)
        setSummaries(next)
      })
      .catch(() => {
        if (active) setSummariesFailed(true)
      })
      .finally(() => {
        if (active) setSummariesLoading(false)
      })

    return () => {
      active = false
    }
  }, [version])

  useEffect(() => {
    if (!selected) return

    let active = true

    void listStoreSettlementData(selected.id)
      .then((next) => {
        if (!active) return
        setDetailFailed(false)
        setDetail(next)
        setSelectedOrderIds(next.eligibleOrders.map((order) => order.id))
      })
      .catch(() => {
        if (active) setDetailFailed(true)
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => {
      active = false
    }
  }, [selected, version])

  const selectedSummary = useMemo(() => {
    if (!selected) return null

    const found = summaries.find((row) => row.storeId === selected.id)
    if (found) return found

    return {
      storeId: selected.id,
      storeName: selected.name,
      eligibleOrders: 0,
      khqrPayable: 0,
      codCommissionOwed: 0,
      currentBalance: 0,
      estimatedNet: 0,
    }
  }, [selected, summaries])

  const eligibleOrders = detail?.eligibleOrders ?? []
  const selectedOrders = eligibleOrders.filter((order) =>
    selectedOrderIds.includes(order.id),
  )
  const selectedKhqr = selectedOrders
    .filter((order) => order.paymentMethod === 'khqr')
    .reduce((total, order) => total + order.storePayoutAmount, 0)
  const selectedCod = selectedOrders
    .filter((order) => order.paymentMethod === 'cod')
    .reduce((total, order) => total + order.commissionAmount, 0)
  const currentBalance = selectedSummary?.currentBalance ?? 0
  const projectedNet = currentBalance + selectedKhqr - selectedCod

  function selectStore(summary: SettlementSummary) {
    setSelected({ id: summary.storeId, name: summary.storeName })
    setDetail(null)
    setDetailLoading(true)
    setDetailFailed(false)
    setSelectedOrderIds([])
    setSettlementResult(null)
    setSettlementOpen(false)
    setTransferErrors({})
    setTransferActionError(null)
    setDeductionErrors({})
    setDeductionActionError(null)
  }

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    )
  }

  function selectAllOrders() {
    setSelectedOrderIds(eligibleOrders.map((order) => order.id))
  }

  function clearOrders() {
    setSelectedOrderIds([])
  }

  function openSettlement() {
    if (!selected || selectedOrders.length === 0) return

    setSettlementOpen(true)
    setReference('')
    setSettlementNote('')
    setSettlementFieldError(null)
    setSettlementActionError(null)
  }

  function closeSettlement() {
    if (settlementBusy) return
    setSettlementOpen(false)
    setSettlementFieldError(null)
    setSettlementActionError(null)
  }

  async function submitSettlement() {
    if (!selected || settlementBusy || selectedOrders.length === 0) return

    if (projectedNet > 0 && reference.trim() === '') {
      setSettlementFieldError(t('admin.settlementReferenceRequired'))
      return
    }

    setSettlementBusy(true)
    setSettlementFieldError(null)
    setSettlementActionError(null)

    try {
      const result = await createSettlement(
        selected.id,
        selectedOrders.map((order) => order.id),
        reference,
        settlementNote,
      )
      setSettlementResult(result)
      setSettlementOpen(false)
      showToast(t('admin.settlementCreated'), { tone: 'success' })
      setDetailLoading(true)
      setVersion((current) => current + 1)
    } catch (error) {
      setSettlementActionError(errorCodeFrom(error))
    } finally {
      setSettlementBusy(false)
    }
  }

  async function submitTransfer() {
    if (!selected || transferBusy) return

    const amount = parseMoneyToCents(transferAmount)
    const errors: TransferErrors = {}

    if (amount === null || amount <= 0) {
      errors.amount = t('admin.settlementAmountInvalid')
    }
    if (transferReference.trim() === '') {
      errors.reference = t('admin.settlementReferenceRequired')
    }
    if (Object.keys(errors).length > 0 || amount === null) {
      setTransferErrors(errors)
      return
    }

    setTransferBusy(true)
    setTransferErrors({})
    setTransferActionError(null)

    try {
      await recordCommissionSettled(
        selected.id,
        amount,
        transferReference,
        transferNote,
      )
      setTransferAmount('')
      setTransferReference('')
      setTransferNote('')
      showToast(t('admin.settlementTransferDone'), { tone: 'success' })
      setDetailLoading(true)
      setVersion((current) => current + 1)
    } catch (error) {
      setTransferActionError(errorCodeFrom(error))
    } finally {
      setTransferBusy(false)
    }
  }

  async function submitDeduction() {
    if (!selected || deductionBusy) return

    const amount = parseMoneyToCents(deductionAmount)
    const errors: DeductionErrors = {}

    if (deductionOrderId === '') {
      errors.order = t('admin.settlementOrderRequired')
    }
    if (amount === null || amount <= 0) {
      errors.amount = t('admin.settlementAmountInvalid')
    }
    if (deductionNote.trim() === '') {
      errors.note = t('admin.settlementNoteRequired')
    }
    if (Object.keys(errors).length > 0 || amount === null) {
      setDeductionErrors(errors)
      return
    }

    setDeductionBusy(true)
    setDeductionErrors({})
    setDeductionActionError(null)

    try {
      await recordDeduction(
        selected.id,
        deductionOrderId,
        amount,
        deductionNote,
      )
      setDeductionOrderId('')
      setDeductionAmount('')
      setDeductionNote('')
      showToast(t('admin.settlementDeductionDone'), { tone: 'success' })
      setDetailLoading(true)
      setVersion((current) => current + 1)
    } catch (error) {
      setDeductionActionError(errorCodeFrom(error))
    } finally {
      setDeductionBusy(false)
    }
  }

  if (summariesLoading && summaries.length === 0) {
    return <LoadingState />
  }

  if (summariesFailed && summaries.length === 0) {
    return (
      <ErrorState
        onRetry={() => {
          setSummariesFailed(false)
          setSummariesLoading(true)
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('admin.settlementsTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('admin.settlementsSubtitle')}
      </p>
      {summariesFailed ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {t('admin.settlementsError')}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setSummariesFailed(false)
              setSummariesLoading(true)
              setVersion((current) => current + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </p>
      ) : null}

      {summaries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('admin.settlementsEmpty')}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('admin.settlementStore')}</th>
                <th className="px-4 py-3">{t('admin.settlementEligible')}</th>
                <th className="px-4 py-3">{t('admin.settlementKhqr')}</th>
                <th className="px-4 py-3">{t('admin.settlementCod')}</th>
                <th className="px-4 py-3">{t('admin.settlementBalance')}</th>
                <th className="px-4 py-3">{t('admin.settlementEstimated')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((summary) => {
                const active = selected?.id === summary.storeId

                return (
                  <tr
                    key={summary.storeId}
                    className={active ? 'bg-emerald-50/40' : undefined}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {summary.storeName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {summary.eligibleOrders}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(summary.khqrPayable)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(summary.codCommissionOwed)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${amountTone(summary.currentBalance)}`}
                    >
                      {formatMoney(summary.currentBalance)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${amountTone(summary.estimatedNet)}`}
                    >
                      {formatMoney(summary.estimatedNet)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => selectStore(summary)}
                      >
                        {t('admin.settlementOpen')}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && selectedSummary ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedSummary.storeName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t('admin.settlementDetailTitle')}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelected(null)
                setSettlementResult(null)
              }}
            >
              {t('admin.settlementClose')}
            </Button>
          </div>

          {settlementResult ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">{t('admin.settlementResult')}</p>
              <p className="mt-1">
                {t('admin.settlementDirection')}:{' '}
                {settlementResult.direction === 'platform_pays'
                  ? t('storeStatement.directionPlatformPays')
                  : t('storeStatement.directionStorePays')}
              </p>
              <p>
                {t('admin.settlementAmount')}:{' '}
                {formatMoney(settlementResult.netAmount)}
              </p>
              <p>
                {t('admin.settlementOrderCount')}: {settlementResult.orders}
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: t('admin.settlementEligible'),
                value: String(selectedSummary.eligibleOrders),
                tone: 'text-slate-900',
              },
              {
                label: t('admin.settlementKhqr'),
                value: formatMoney(selectedSummary.khqrPayable),
                tone: 'text-emerald-700',
              },
              {
                label: t('admin.settlementCod'),
                value: formatMoney(selectedSummary.codCommissionOwed),
                tone: 'text-red-700',
              },
              {
                label: t('admin.settlementBalance'),
                value: formatMoney(selectedSummary.currentBalance),
                tone: amountTone(selectedSummary.currentBalance),
              },
              {
                label: t('admin.settlementEstimated'),
                value: formatMoney(selectedSummary.estimatedNet),
                tone: amountTone(selectedSummary.estimatedNet),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs font-medium text-slate-500">
                  {item.label}
                </p>
                <p className={`mt-1 text-lg font-bold ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-sm text-slate-600">
            {selectedSummary.estimatedNet >= 0
              ? t('admin.settlementPositiveHint')
              : t('admin.settlementNegativeHint')}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('admin.settlementOrders')}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t('admin.settlementOrdersHint')}
                </p>
              </div>
              {eligibleOrders.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={selectAllOrders}
                  >
                    {t('admin.settlementSelectAll')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={clearOrders}>
                    {t('admin.settlementClear')}
                  </Button>
                </div>
              ) : null}
            </div>

            {detailFailed ? (
              <div className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {t('admin.settlementDetailError')}{' '}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => {
                    setDetailFailed(false)
                    setDetailLoading(true)
                    setVersion((current) => current + 1)
                  }}
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : detailLoading && !detail ? (
              <p className="mt-4 text-sm text-slate-500">
                {t('common.loading')}
              </p>
            ) : eligibleOrders.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                {t('admin.settlementOrdersEmpty')}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {eligibleOrders.map((order) => {
                  const checked = selectedOrderIds.includes(order.id)
                  const amount =
                    order.paymentMethod === 'khqr'
                      ? order.storePayoutAmount
                      : order.commissionAmount

                  return (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <label className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOrder(order.id)}
                          className="mt-1 size-4 accent-emerald-600"
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/admin/orders/${order.id}`}
                              className="font-mono text-sm font-semibold text-emerald-700 hover:underline"
                            >
                              {order.orderCode}
                            </Link>
                            <span className="text-xs text-slate-500">
                              {order.customerName}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {t(paymentLabelKey(order.paymentMethod))}
                            {' · '}
                            {t('admin.settlementDelivered')}{' '}
                            {formatDateTime(order.deliveredAt, language)}
                          </span>
                        </span>
                      </label>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {order.paymentMethod === 'khqr'
                            ? t('admin.settlementPayout')
                            : t('admin.settlementCommission')}
                        </p>
                        <p
                          className={`text-sm font-semibold ${amountTone(amount)}`}
                        >
                          {formatMoney(amount)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('admin.settlementOrderTotal')}:{' '}
                          {formatMoney(order.totalAmount)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                {t('admin.settlementProjected')}:{' '}
                <span className={`font-semibold ${amountTone(projectedNet)}`}>
                  {formatMoney(projectedNet)}
                </span>
              </p>
              <Button
                onClick={openSettlement}
                disabled={
                  selectedOrders.length === 0 ||
                  detailLoading ||
                  settlementBusy ||
                  detailFailed
                }
              >
                {t('admin.settlementSettle')}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('admin.settlementTransferTitle')}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('admin.settlementTransferHint')}
              </p>

              <div className="mt-3 space-y-3">
                <Input
                  label={t('admin.settlementTransferAmount')}
                  value={transferAmount}
                  onChange={(event) => {
                    setTransferAmount(event.target.value)
                    setTransferErrors((current) => ({
                      ...current,
                      amount: undefined,
                    }))
                  }}
                  inputMode="decimal"
                  error={transferErrors.amount}
                  placeholder="0.00"
                  disabled={transferBusy}
                />
                <Input
                  label={t('admin.settlementTransferReference')}
                  value={transferReference}
                  onChange={(event) => {
                    setTransferReference(event.target.value)
                    setTransferErrors((current) => ({
                      ...current,
                      reference: undefined,
                    }))
                  }}
                  error={transferErrors.reference}
                  maxLength={200}
                  disabled={transferBusy}
                />
                <Textarea
                  label={t('admin.settlementTransferNote')}
                  value={transferNote}
                  onChange={(event) => setTransferNote(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  disabled={transferBusy}
                />

                {transferActionError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {getErrorMessage(transferActionError, language)}
                  </p>
                ) : null}

                <Button
                  onClick={() => void submitTransfer()}
                  disabled={transferBusy}
                >
                  {transferBusy
                    ? t('storeOrders.saving')
                    : t('admin.settlementTransferSubmit')}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('admin.settlementDeductionTitle')}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('admin.settlementDeductionHint')}
              </p>

              <div className="mt-3 space-y-3">
                <Select
                  label={t('admin.settlementDeductionOrder')}
                  value={deductionOrderId}
                  onChange={(event) => {
                    setDeductionOrderId(event.target.value)
                    setDeductionErrors((current) => ({
                      ...current,
                      order: undefined,
                    }))
                  }}
                  error={deductionErrors.order}
                  disabled={deductionBusy}
                >
                  <option value="">
                    {t('admin.settlementDeductionSelectOrder')}
                  </option>
                  {(detail?.orderChoices ?? []).map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderCode} · {t(orderStatusLabels[order.status])}
                    </option>
                  ))}
                </Select>

                <Input
                  label={t('admin.settlementDeductionAmount')}
                  value={deductionAmount}
                  onChange={(event) => {
                    setDeductionAmount(event.target.value)
                    setDeductionErrors((current) => ({
                      ...current,
                      amount: undefined,
                    }))
                  }}
                  inputMode="decimal"
                  error={deductionErrors.amount}
                  placeholder="0.00"
                  disabled={deductionBusy}
                />
                <Textarea
                  label={t('admin.settlementDeductionNote')}
                  value={deductionNote}
                  onChange={(event) => {
                    setDeductionNote(event.target.value)
                    setDeductionErrors((current) => ({
                      ...current,
                      note: undefined,
                    }))
                  }}
                  error={deductionErrors.note}
                  rows={2}
                  maxLength={1000}
                  disabled={deductionBusy}
                />

                {deductionActionError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {getErrorMessage(deductionActionError, language)}
                  </p>
                ) : null}

                <Button
                  onClick={() => void submitDeduction()}
                  disabled={deductionBusy}
                >
                  {deductionBusy
                    ? t('storeOrders.saving')
                    : t('admin.settlementDeductionSubmit')}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {t('admin.settlementLedger')}
            </h3>

            {detailLoading && !detail ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('common.loading')}
              </p>
            ) : (detail?.ledger.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('admin.settlementLedgerEmpty')}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {detail?.ledger.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {t(ledgerTypeLabels[entry.type])}
                        {!entry.affectsBalance
                          ? ` · ${t('storeStatement.infoOnly')}`
                          : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(entry.createdAt, language)}
                        {entry.orderCode ? ` · ${entry.orderCode}` : ''}
                      </p>
                      {entry.note ? (
                        <p className="mt-0.5 whitespace-pre-line break-words text-xs text-slate-600">
                          {entry.note}
                        </p>
                      ) : null}
                    </div>
                    <p
                      className={`shrink-0 text-sm font-semibold ${amountTone(entry.amount)}`}
                    >
                      {entry.amount > 0 ? '+' : ''}
                      {formatMoney(entry.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {t('admin.settlementHistory')}
            </h3>

            {detailLoading && !detail ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('common.loading')}
              </p>
            ) : (detail?.settlements.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('admin.settlementHistoryEmpty')}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {detail?.settlements.map((settlement) => (
                  <li key={settlement.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {settlement.periodLabel}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(settlement.createdAt, language)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMoney(settlement.netAmount)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {settlement.direction === 'platform_pays'
                            ? t('storeStatement.directionPlatformPays')
                            : t('storeStatement.directionStorePays')}
                        </p>
                      </div>
                    </div>
                    {settlement.reference ? (
                      <p className="mt-1 text-xs text-slate-600">
                        {t('storeStatement.reference')}: {settlement.reference}
                      </p>
                    ) : null}
                    {settlement.note ? (
                      <p className="mt-1 whitespace-pre-line break-words text-xs text-slate-600">
                        {settlement.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {settlementOpen ? (
        <ConfirmDialog
          title={t('admin.settlementConfirmTitle')}
          confirmLabel={
            settlementBusy
              ? t('storeOrders.saving')
              : t('admin.settlementSettle')
          }
          cancelLabel={t('common.cancel')}
          onConfirm={() => void submitSettlement()}
          onCancel={closeSettlement}
          confirmDisabled={settlementBusy}
        >
          <p>{t('admin.settlementConfirmText')}</p>

          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">
              {projectedNet > 0
                ? t('admin.settlementPayAmount')
                : t('admin.settlementStoreOwes')}
              : {formatMoney(Math.abs(projectedNet))}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {projectedNet > 0
                ? t('admin.settlementPositiveHint')
                : t('admin.settlementCarried')}
            </p>
          </div>

          {settlementActionError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getErrorMessage(settlementActionError, language)}
            </p>
          ) : null}

          {projectedNet > 0 ? (
            <div className="mt-3">
              <Input
                label={t('admin.settlementReference')}
                value={reference}
                onChange={(event) => {
                  setReference(event.target.value)
                  setSettlementFieldError(null)
                }}
                error={settlementFieldError ?? undefined}
                maxLength={200}
                disabled={settlementBusy}
              />
            </div>
          ) : null}

          <div className="mt-3">
            <Textarea
              label={t('admin.settlementNote')}
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
              rows={2}
              maxLength={1000}
              disabled={settlementBusy}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

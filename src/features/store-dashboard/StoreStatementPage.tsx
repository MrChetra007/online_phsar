import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getCodCommissionOwed,
  getStoreBalance,
  listStoreLedger,
  listStoreSettlements,
  type LedgerType,
  type StoreLedgerEntry,
  type StoreSettlement,
} from '../../api/statement'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { formatDateTime } from '../../lib/datetime'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { formatMoney } from '../../lib/money'
import { useMyStore } from './useMyStore'

const ledgerTypeLabels: Record<LedgerType, TranslationKey> = {
  customer_payment: 'ledgerType.customer_payment',
  cod_collected_by_store: 'ledgerType.cod_collected_by_store',
  commission: 'ledgerType.commission',
  delivery_fee_passthrough: 'ledgerType.delivery_fee_passthrough',
  store_payable: 'ledgerType.store_payable',
  commission_receivable: 'ledgerType.commission_receivable',
  commission_settled: 'ledgerType.commission_settled',
  payout_paid: 'ledgerType.payout_paid',
  refund: 'ledgerType.refund',
  deduction: 'ledgerType.deduction',
}

function amountTone(amount: number): string {
  if (amount > 0) return 'text-emerald-700'
  if (amount < 0) return 'text-red-700'
  return 'text-slate-600'
}

export function StoreStatementPage() {
  const { t, language } = useI18n()
  const {
    store,
    loading: storeLoading,
    failed: storeFailed,
    reload,
  } = useMyStore()

  const [balance, setBalance] = useState(0)
  const [codOwed, setCodOwed] = useState(0)
  const [ledger, setLedger] = useState<StoreLedgerEntry[]>([])
  const [settlements, setSettlements] = useState<StoreSettlement[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!store) return

    let active = true

    void Promise.all([
      getStoreBalance(store.id),
      getCodCommissionOwed(store.id),
      listStoreLedger(store.id),
      listStoreSettlements(store.id),
    ])
      .then(([nextBalance, nextCodOwed, nextLedger, nextSettlements]) => {
        if (!active) return
        setBalance(nextBalance)
        setCodOwed(nextCodOwed)
        setLedger(nextLedger)
        setSettlements(nextSettlements)
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
  }, [store, version])

  if (storeLoading && !store) return <LoadingState />

  if (storeFailed) {
    return <ErrorState onRetry={reload} />
  }

  if (!store) {
    return (
      <section className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('storeStatement.title')}
        </h1>
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t('store.onboardingTitle')}
        </p>
        <Link
          to="/store"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          {t('storeStatement.backToDashboard')}
        </Link>
      </section>
    )
  }

  const balanceHint =
    balance > 0
      ? t('storeStatement.balancePositive')
      : balance < 0
        ? t('storeStatement.balanceNegative')
        : t('storeStatement.balanceZero')

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('storeStatement.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('storeStatement.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/store/orders"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {t('storeStatement.manageOrders')}
          </Link>
          <Link
            to="/store"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {t('storeStatement.backToDashboard')}
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">{t('common.loading')}</p>
      ) : failed ? (
        <div className="mt-6 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
          {t('storeStatement.error')}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setFailed(false)
              setLoading(true)
              setVersion((current) => current + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                {t('storeStatement.balance')}
              </p>
              <p className={`mt-2 text-3xl font-bold ${amountTone(balance)}`}>
                {formatMoney(balance)}
              </p>
              <p className="mt-2 text-sm text-slate-600">{balanceHint}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                {t('storeStatement.codOwed')}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatMoney(codOwed)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {t('storeStatement.codOwedHint')}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('storeStatement.ledger')}
            </h2>

            {ledger.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                {t('storeStatement.ledgerEmpty')}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {ledger.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {t(ledgerTypeLabels[entry.type])}
                        </p>
                        {!entry.affectsBalance ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {t('storeStatement.infoOnly')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(entry.createdAt, language)}
                        {entry.orderCode
                          ? ` · ${t('storeStatement.order')} ${entry.orderCode}`
                          : ''}
                      </p>
                      {entry.note ? (
                        <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                          {entry.note}
                        </p>
                      ) : null}
                    </div>
                    <p
                      className={`shrink-0 font-semibold ${amountTone(entry.amount)}`}
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
            <h2 className="text-lg font-semibold text-slate-900">
              {t('storeStatement.settlements')}
            </h2>

            {settlements.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                {t('storeStatement.settlementsEmpty')}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {settlements.map((settlement) => (
                  <li
                    key={settlement.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {settlement.periodLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDateTime(settlement.createdAt, language)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatMoney(settlement.netAmount)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {settlement.direction === 'platform_pays'
                            ? t('storeStatement.directionPlatformPays')
                            : t('storeStatement.directionStorePays')}
                        </p>
                      </div>
                    </div>
                    {settlement.reference ? (
                      <p className="mt-2 break-words text-sm text-slate-600">
                        {t('storeStatement.reference')}: {settlement.reference}
                      </p>
                    ) : null}
                    {settlement.note ? (
                      <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                        {settlement.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}

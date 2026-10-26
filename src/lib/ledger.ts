import type { LedgerType } from '../api/statement'
import type { TranslationKey } from './i18n/translations'

export const ledgerTypeLabels: Record<LedgerType, TranslationKey> = {
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

import {
  orderStatusLabels,
  orderStatusTones,
  paymentStatusLabels,
  paymentStatusTones,
  type OrderStatus,
  type PaymentStatus,
} from '../lib/orderStatus'
import { useI18n } from '../lib/i18n'

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  )
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n()
  return (
    <Badge
      label={t(orderStatusLabels[status])}
      tone={orderStatusTones[status]}
    />
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n()
  return (
    <Badge
      label={t(paymentStatusLabels[status])}
      tone={paymentStatusTones[status]}
    />
  )
}

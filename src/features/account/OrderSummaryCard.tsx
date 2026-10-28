import { Link } from 'react-router-dom'
import type { MyOrderSummary } from '../../api/customer'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { ArrowRightIcon } from '../../components/icons'
import { formatDateTime } from '../../lib/datetime'
import { useI18n } from '../../lib/i18n'
import { formatMoney } from '../../lib/money'

export function OrderSummaryCard({ order }: { order: MyOrderSummary }) {
  const { t, language } = useI18n()

  return (
    <Link
      to={`/account/orders/${order.id}`}
      className="group flex flex-col gap-3 rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">
            {order.store_name}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {order.order_code} · {formatDateTime(order.created_at, language)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {order.item_count} {t('account.items')} ·{' '}
          {formatMoney(order.total_amount)}
        </p>
      </div>
      <span className="flex items-center gap-1 self-start text-xs font-semibold text-slate-700 sm:self-center">
        {t('account.viewOrder')}
        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

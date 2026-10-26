import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'
import {
  escapeHtml,
  formatDateTime,
  formatMoney,
  isRecord,
  sendTelegramMessage,
  truncate,
} from '../_shared/telegram.ts'

const maxAttempts = 5
const defaultLimit = 20
const maxLimit = 50

type NotificationRow = {
  id: string
  event: string
  target: string
  order_id: string | null
  store_id: string | null
  payload: Record<string, unknown>
  attempts: number
  created_at: string
}

type OrderRow = {
  id: string
  order_code: string
  status: string
  payment_method: string
  payment_status: string
  customer_name: string
  customer_phone: string
  address: string
  province: string
  subtotal: number
  delivery_fee: number
  total_amount: number
  problem_note: string | null
  courier_name: string | null
  tracking_note: string | null
  created_at: string
}

type ItemRow = {
  name_snapshot: string
  variant_label_snapshot: string | null
  unit_price: number
  quantity: number
}

type NotificationContext = {
  order: OrderRow | null
  items: ItemRow[]
  storeName: string | null
}

const orderFields =
  'id, order_code, status, payment_method, payment_status, customer_name, customer_phone, address, province, subtotal, delivery_fee, total_amount, problem_note, courier_name, tracking_note, created_at'

const statusLabels: Record<string, string> = {
  pending: 'រង់ចាំ / Pending',
  confirmed: 'បានបញ្ជាក់ / Confirmed',
  rejected: 'បានបដិសេធ / Rejected',
  cancelled: 'បានបោះបង់ / Cancelled',
  shipped: 'បានដឹកជញ្ជូន / Shipped',
  delivered: 'បានដឹកជញ្ជូនរួច / Delivered',
  completed: 'បានបញ្ចប់ / Completed',
  paid_out: 'បានទូទាត់ / Paid out',
  refused: 'បានបដិសេធ / Refused',
  returned: 'បានត្រឡប់ / Returned',
  refunded: 'បានសងប្រាក់វិញ / Refunded',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function decodeJwtRole(request: Request): string | null {
  const header = request.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : ''
  const encoded = token.split('.')[1]
  if (!encoded) return null

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const payload: unknown = JSON.parse(atob(padded))
    return isRecord(payload) && typeof payload.role === 'string'
      ? payload.role
      : null
  } catch {
    return null
  }
}

function parseLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return defaultLimit
  return Math.min(maxLimit, Math.max(1, Math.floor(value)))
}

function parseChatId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return null

  const text = value.trim()
  return /^-?\d+$/.test(text) ? text : null
}

function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}

function paymentLabel(method: string, status: string): string {
  if (method === 'cod') return 'COD (បង់ពេលទទួល / cash on delivery)'
  if (status === 'paid') return 'KHQR (បានបង់ / paid)'
  if (status === 'flagged') return 'KHQR (ត្រូវពិនិត្យ / flagged)'
  if (status === 'refund_due') return 'KHQR (ត្រូវសងវិញ / refund due)'
  if (status === 'refunded') return 'KHQR (បានសងវិញ / refunded)'
  return 'KHQR (មិនទាន់បង់ / unpaid)'
}

function eventTitle(event: string): string {
  switch (event) {
    case 'new_order':
      return '🛒 ការបញ្ជាទិញថ្មី / New order'
    case 'payment_flagged':
      return '⚠️ ការទូទាត់ត្រូវពិនិត្យ / Payment flagged'
    case 'order_cancelled':
      return '❌ ការបញ្ជាទិញត្រូវបានបោះបង់ / Order cancelled'
    case 'order_refused':
      return '❌ ការបញ្ជាទិញត្រូវបានបដិសេធ / Order refused'
    case 'order_returned':
      return '↩️ ការបញ្ជាទិញត្រូវបានត្រឡប់ / Order returned'
    case 'failed_delivery':
      return '⚠️ ការដឹកជញ្ជូនបរាជ័យ / Failed delivery'
    case 'customer_problem':
      return '⚠️ អតិថិជនរាយការណ៍បញ្ហា / Customer problem'
    case 'payout_sent':
      return '💵 ការទូទាត់ត្រូវបានផ្ញើ / Payout sent'
    case 'ship_reminder':
      return '⏰ សូមដឹកជញ្ជូន / Please ship'
    case 'late_shipment':
      return '⏰ ការដឹកជញ្ជូនយឺត / Late shipment'
    default:
      return '🔔 ការជូនដំណឹង / Notification'
  }
}

function footer(row: NotificationRow): string | null {
  switch (row.event) {
    case 'new_order':
      return row.target === 'store'
        ? 'សូមបញ្ជាក់ ឬបដិសេធការបញ្ជាទិញនេះនៅក្នុងផ្ទាំងគ្រប់គ្រងហាង។\n<i>Confirm or reject this order in the store dashboard.</i>'
        : 'ការបញ្ជាទិញថ្មីត្រូវបានបង្កើត។\n<i>A new order was placed.</i>'
    case 'payment_flagged':
      return 'សូមពិនិត្យការទូទាត់នេះ។\n<i>Please review this payment.</i>'
    case 'customer_problem':
      return 'សូមពិនិត្យបញ្ហារបស់អតិថិជន។\n<i>Please review the customer problem.</i>'
    case 'failed_delivery':
      return 'សូមតាមដានការដឹកជញ្ជូន។\n<i>Please follow up on the delivery.</i>'
    case 'ship_reminder':
      return 'សូមដឹកជញ្ជូនការបញ្ជាទិញនេះឱ្យបានឆាប់។\n<i>Please ship this order soon.</i>'
    case 'late_shipment':
      return 'ការបញ្ជាទិញនេះហួសកំណត់ដឹកជញ្ជូន។\n<i>This order is past the shipping deadline.</i>'
    case 'payout_sent':
      return 'សូមពិនិត្យគណនីធនាគាររបស់អ្នក។\n<i>Please check your bank account.</i>'
    default:
      return null
  }
}

function buildMessage(
  row: NotificationRow,
  context: NotificationContext,
): string {
  const lines: string[] = [`<b>${eventTitle(row.event)}</b>`]
  const { order, items, storeName } = context

  if (storeName) {
    lines.push(`ហាង / Store: <b>${escapeHtml(storeName)}</b>`)
  }

  if (order) {
    lines.push(`លេខ / Code: <code>${escapeHtml(order.order_code)}</code>`)
    lines.push(`ស្ថានភាព / Status: ${statusLabel(order.status)}`)
    lines.push(
      `ការទូទាត់ / Payment: ${paymentLabel(order.payment_method, order.payment_status)}`,
    )
    lines.push(`អតិថិជន / Customer: ${escapeHtml(order.customer_name)}`)
    lines.push(`ទូរស័ព្ទ / Phone: ${escapeHtml(order.customer_phone)}`)
    lines.push(
      `អាសយដ្ឋាន / Address: ${escapeHtml(order.address)}, ${escapeHtml(order.province)}`,
    )

    if (items.length > 0) {
      lines.push('', 'ទំនិញ / Items:')
      for (const item of items.slice(0, 10)) {
        const variant = item.variant_label_snapshot
          ? ` (${escapeHtml(item.variant_label_snapshot)})`
          : ''
        lines.push(
          `• ${item.quantity} × ${escapeHtml(item.name_snapshot)}${variant} — ${formatMoney(item.unit_price * item.quantity)}`,
        )
      }
      if (items.length > 10) {
        lines.push(`• +${items.length - 10} more`)
      }
    }

    lines.push('', `សរុប / Total: <b>${formatMoney(order.total_amount)}</b>`)

    if (order.delivery_fee > 0) {
      lines.push(`ថ្លៃដឹកជញ្ជូន / Delivery: ${formatMoney(order.delivery_fee)}`)
    }
    if (order.courier_name) {
      lines.push(`អ្នកដឹកជញ្ជូន / Courier: ${escapeHtml(order.courier_name)}`)
    }
    if (order.tracking_note) {
      lines.push(`តាមដាន / Tracking: ${escapeHtml(order.tracking_note)}`)
    }
    if (order.problem_note) {
      lines.push('', `បញ្ហា / Problem: ${escapeHtml(order.problem_note)}`)
    }
  }

  if (row.event === 'payout_sent') {
    const amount = row.payload.amount
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      lines.push(`ចំនួនទឹកប្រាក់ / Amount: <b>${formatMoney(amount)}</b>`)
    }
  }

  const note = footer(row)
  if (note) lines.push('', note)

  const timestamp = formatDateTime(order?.created_at ?? row.created_at)
  if (timestamp) lines.push('', `<i>${timestamp}</i>`)

  return truncate(lines.join('\n'))
}

async function resolveChatId(
  service: SupabaseClient,
  row: NotificationRow,
): Promise<string | null> {
  if (row.target === 'store') {
    if (!row.store_id) return null
    const { data, error } = await service
      .from('store_private')
      .select('telegram_chat_id')
      .eq('store_id', row.store_id)
      .maybeSingle()
    if (error) throw new Error(`Could not load store chat: ${error.message}`)
    return parseChatId(data?.telegram_chat_id)
  }

  const { data, error } = await service
    .from('platform_settings')
    .select('value')
    .eq('key', 'admin_telegram_chat_id')
    .maybeSingle()
  if (error) throw new Error(`Could not load admin chat: ${error.message}`)
  return parseChatId(data?.value)
}

async function loadContext(
  service: SupabaseClient,
  row: NotificationRow,
): Promise<NotificationContext> {
  const storeId = row.store_id
  let storeName: string | null = null

  if (storeId) {
    const { data, error } = await service
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .maybeSingle()
    if (error) throw new Error(`Could not load store: ${error.message}`)
    storeName = typeof data?.name === 'string' ? data.name : null
  }

  if (!row.order_id) {
    return { order: null, items: [], storeName }
  }

  const { data: order, error: orderError } = await service
    .from('orders')
    .select(orderFields)
    .eq('id', row.order_id)
    .maybeSingle()
  if (orderError) throw new Error(`Could not load order: ${orderError.message}`)

  const { data: items, error: itemError } = await service
    .from('order_items')
    .select('name_snapshot, variant_label_snapshot, unit_price, quantity')
    .eq('order_id', row.order_id)
  if (itemError) throw new Error(`Could not load items: ${itemError.message}`)

  return {
    order: (order as unknown as OrderRow | null) ?? null,
    items: (items ?? []) as unknown as ItemRow[],
    storeName,
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ ok: false, reason: 'method_not_allowed' }, 405)
  }

  if (decodeJwtRole(request) !== 'service_role') {
    return json({ ok: false, reason: 'forbidden' }, 403)
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!botToken || !supabaseUrl || !serviceKey) {
    console.error('Notify function is not configured')
    return json({ ok: false, reason: 'not_configured' }, 503)
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const limit =
    isRecord(body) && body.limit !== undefined
      ? parseLimit(body.limit)
      : defaultLimit
  const service = createClient(supabaseUrl, serviceKey)
  const selectFields =
    'id, event, target, order_id, store_id, payload, attempts, created_at'
  const { data: pending, error: pendingError } = await service
    .from('notifications')
    .select(selectFields)
    .eq('status', 'pending')
    .lt('attempts', maxAttempts)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (pendingError) {
    console.error('Could not read pending notifications', pendingError.message)
    return json({ ok: false, reason: 'database_error' }, 500)
  }

  const rows = ((pending ?? []) as unknown as NotificationRow[]).slice()

  if (rows.length < limit) {
    const { data: retries, error: retryError } = await service
      .from('notifications')
      .select(selectFields)
      .eq('status', 'failed')
      .lt('attempts', maxAttempts)
      .order('created_at', { ascending: true })
      .limit(limit - rows.length)

    if (retryError) {
      console.error('Could not read failed notifications', retryError.message)
    } else {
      rows.push(...((retries ?? []) as unknown as NotificationRow[]))
    }
  }

  let sent = 0
  let failed = 0

  for (const row of rows) {
    const attempts = Number(row.attempts) + 1

    try {
      const chatId = await resolveChatId(service, row)
      if (!chatId) throw new Error('chat_id_not_configured')

      const context = await loadContext(service, row)
      const message = buildMessage(row, context)
      await sendTelegramMessage(botToken, chatId, message)

      const { error: updateError } = await service
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts,
          last_error: null,
        })
        .eq('id', row.id)

      if (updateError) {
        console.error('Could not mark notification sent', updateError.message)
        failed += 1
      } else {
        sent += 1
      }
    } catch (error) {
      failed += 1
      const detail = error instanceof Error ? error.message : String(error)
      const { error: updateError } = await service
        .from('notifications')
        .update({
          status: 'failed',
          attempts,
          last_error: truncate(detail, 500),
        })
        .eq('id', row.id)

      if (updateError) {
        console.error('Could not mark notification failed', updateError.message)
      }
    }
  }

  return json({ ok: true, processed: rows.length, sent, failed })
})

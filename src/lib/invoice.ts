import { formatDateTime } from './datetime'
import type { Language } from './i18n/context'
import type { TranslationKey } from './i18n/translations'
import { formatMoney } from './money'
import { provinceLabel } from './provinces'

export type InvoicePaymentMethod = 'cod' | 'khqr'

export type OrderInvoiceItem = {
  name: string
  variant: string | null
  unitPrice: number
  quantity: number
}

export type OrderInvoice = {
  orderCode: string
  storeName: string
  storeSlug: string
  customerName: string
  customerPhone: string
  address: string
  province: string
  paymentMethod: InvoicePaymentMethod
  subtotal: number
  deliveryFee: number
  totalAmount: number
  createdAt: string
  items: OrderInvoiceItem[]
}

type Translate = (key: TranslationKey) => string

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseItem(value: unknown): OrderInvoiceItem | null {
  if (!isRecord(value)) return null
  if (!isText(value.name) || !isMoney(value.unitPrice)) return null
  if (!Number.isInteger(value.quantity) || (value.quantity as number) < 1) {
    return null
  }
  if (
    value.variant !== null &&
    value.variant !== undefined &&
    typeof value.variant !== 'string'
  ) {
    return null
  }

  return {
    name: value.name,
    variant: typeof value.variant === 'string' ? value.variant : null,
    unitPrice: value.unitPrice,
    quantity: value.quantity as number,
  }
}

export function parseOrderInvoice(value: unknown): OrderInvoice | null {
  if (!isRecord(value)) return null
  if (
    !isText(value.orderCode) ||
    !isText(value.storeName) ||
    !isText(value.storeSlug) ||
    !isText(value.customerName) ||
    !isText(value.customerPhone) ||
    !isText(value.address) ||
    !isText(value.province) ||
    !isText(value.createdAt) ||
    (value.paymentMethod !== 'cod' && value.paymentMethod !== 'khqr') ||
    !isMoney(value.subtotal) ||
    !isMoney(value.deliveryFee) ||
    !isMoney(value.totalAmount) ||
    !Array.isArray(value.items)
  ) {
    return null
  }

  const items: OrderInvoiceItem[] = []
  for (const raw of value.items) {
    const item = parseItem(raw)
    if (!item) return null
    items.push(item)
  }
  if (items.length === 0) return null

  return {
    orderCode: value.orderCode,
    storeName: value.storeName,
    storeSlug: value.storeSlug,
    customerName: value.customerName,
    customerPhone: value.customerPhone,
    address: value.address,
    province: value.province,
    paymentMethod: value.paymentMethod,
    subtotal: value.subtotal,
    deliveryFee: value.deliveryFee,
    totalAmount: value.totalAmount,
    createdAt: value.createdAt,
    items,
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

function paymentLabel(method: InvoicePaymentMethod, t: Translate): string {
  return method === 'cod' ? t('order.paymentCod') : t('order.paymentKhqr')
}

export function buildInvoiceHtml(
  invoice: OrderInvoice,
  language: Language,
  t: Translate,
): string {
  const rows = invoice.items
    .map((item) => {
      const variant = item.variant
        ? `<span class="variant">${escapeHtml(item.variant)}</span>`
        : ''

      return `<tr>
        <td><strong>${escapeHtml(item.name)}</strong>${variant}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatMoney(item.unitPrice)}</td>
        <td class="num">${formatMoney(item.unitPrice * item.quantity)}</td>
      </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(t('invoice.title'))} ${escapeHtml(invoice.orderCode)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px;
    background: #f5f5f4;
    color: #0f172a;
    font-family: "Noto Sans Khmer", "Khmer OS Battambang", "Leelawadee UI", "Segoe UI", sans-serif;
    line-height: 1.6;
  }
  .invoice {
    width: min(100%, 860px);
    margin: 0 auto;
    padding: 44px;
    border: 1px solid #e7e5e4;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 24px 70px rgba(6, 78, 59, 0.08);
  }
  .actions { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .actions button {
    border: 0;
    border-radius: 999px;
    padding: 12px 20px;
    background: #047857;
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .eyebrow {
    margin: 0 0 4px;
    color: #047857;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  h1 { margin: 0; font-size: 30px; line-height: 1.2; }
  .code { margin: 8px 0 0; color: #64748b; font-family: ui-monospace, monospace; font-size: 13px; }
  .total-box {
    min-width: 170px;
    padding: 18px 20px;
    border-radius: 16px;
    background: #ecfdf5;
    color: #064e3b;
    text-align: right;
  }
  .total-box span { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  .total-box strong { display: block; margin-top: 4px; font-size: 26px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 34px; padding-top: 26px; border-top: 1px solid #e7e5e4; }
  .meta h2 { margin: 0 0 8px; color: #64748b; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
  .meta p { margin: 0; }
  .muted { color: #64748b; font-size: 14px; }
  table { width: 100%; margin-top: 30px; border-collapse: collapse; font-size: 14px; }
  th { padding: 10px 8px; border-bottom: 1px solid #cbd5e1; color: #64748b; font-size: 11px; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
  td { padding: 14px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .variant { display: block; margin-top: 2px; color: #64748b; font-size: 12px; }
  .summary { display: flex; justify-content: flex-end; margin-top: 22px; }
  .summary dl { width: min(100%, 330px); margin: 0; }
  .summary div { display: flex; justify-content: space-between; gap: 24px; padding: 7px 0; }
  .summary dt { color: #64748b; }
  .summary dd { margin: 0; font-weight: 600; }
  .summary .grand { margin-top: 8px; padding-top: 14px; border-top: 2px solid #0f172a; font-size: 18px; }
  .summary .grand dt, .summary .grand dd { color: #0f172a; font-weight: 800; }
  .payment { margin-top: 26px; padding: 16px 18px; border-radius: 14px; background: #f8fafc; color: #475569; font-size: 13px; }
  footer { margin-top: 34px; padding-top: 20px; border-top: 1px solid #e7e5e4; color: #64748b; font-size: 12px; }
  footer p { margin: 0; }
  footer p + p { margin-top: 4px; }
  @media (max-width: 640px) {
    body { padding: 14px; }
    .invoice { padding: 24px; border-radius: 14px; }
    .top { flex-direction: column; }
    .total-box { width: 100%; text-align: left; }
    .meta { grid-template-columns: 1fr; }
    th:nth-child(3), td:nth-child(3) { display: none; }
  }
  @media print {
    body { padding: 0; background: #fff; }
    .invoice { width: 100%; padding: 0; border: 0; box-shadow: none; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <main class="invoice">
    <div class="actions no-print">
      <button type="button" onclick="window.print()">${escapeHtml(t('invoice.print'))}</button>
    </div>

    <header class="top">
      <div>
        <p class="eyebrow">${escapeHtml(t('invoice.title'))}</p>
        <h1>${escapeHtml(invoice.storeName)}</h1>
        <p class="code">${escapeHtml(t('order.code'))}: ${escapeHtml(invoice.orderCode)}</p>
      </div>
      <div class="total-box">
        <span>${escapeHtml(t('invoice.total'))}</span>
        <strong>${formatMoney(invoice.totalAmount)}</strong>
      </div>
    </header>

    <section class="meta">
      <div>
        <h2>${escapeHtml(t('invoice.billedTo'))}</h2>
        <p><strong>${escapeHtml(invoice.customerName)}</strong></p>
        <p class="muted">${escapeHtml(t('invoice.phone'))}: ${escapeHtml(invoice.customerPhone)}</p>
        <p class="muted">${multiline(invoice.address)}<br />${escapeHtml(provinceLabel(invoice.province, language))}</p>
      </div>
      <div>
        <h2>${escapeHtml(t('invoice.date'))}</h2>
        <p>${escapeHtml(formatDateTime(invoice.createdAt, language))}</p>
        <p class="muted">${escapeHtml(t('invoice.paymentMethod'))}: ${escapeHtml(paymentLabel(invoice.paymentMethod, t))}</p>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t('invoice.item'))}</th>
          <th class="num">${escapeHtml(t('invoice.quantity'))}</th>
          <th class="num">${escapeHtml(t('invoice.unitPrice'))}</th>
          <th class="num">${escapeHtml(t('invoice.amount'))}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="summary">
      <dl>
        <div>
          <dt>${escapeHtml(t('checkout.subtotal'))}</dt>
          <dd>${formatMoney(invoice.subtotal)}</dd>
        </div>
        <div>
          <dt>${escapeHtml(t('order.delivery'))}</dt>
          <dd>${formatMoney(invoice.deliveryFee)}</dd>
        </div>
        <div class="grand">
          <dt>${escapeHtml(t('invoice.total'))}</dt>
          <dd>${formatMoney(invoice.totalAmount)}</dd>
        </div>
      </dl>
    </div>

    <p class="payment">${escapeHtml(paymentLabel(invoice.paymentMethod, t))}</p>

    <footer>
      <p>${escapeHtml(t('invoice.thankYou'))}</p>
      <p>${escapeHtml(t('invoice.saveHint'))}</p>
    </footer>
  </main>
</body>
</html>`
}

function invoiceFileName(orderCode: string): string {
  const safe = orderCode
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `invoice-${safe || 'order'}.html`
}

export function downloadInvoice(
  invoice: OrderInvoice,
  language: Language,
  t: Translate,
): void {
  const blob = new Blob([buildInvoiceHtml(invoice, language, t)], {
    type: 'text/html;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = invoiceFileName(invoice.orderCode)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const autoDownloaded = new Set<string>()

export function downloadInvoiceAutomatically(
  invoice: OrderInvoice,
  language: Language,
  t: Translate,
): void {
  const key = `kos.invoice.auto.${invoice.orderCode}`
  if (autoDownloaded.has(key)) return

  autoDownloaded.add(key)
  try {
    if (sessionStorage.getItem(key) === '1') return
    sessionStorage.setItem(key, '1')
  } catch {}

  downloadInvoice(invoice, language, t)
}

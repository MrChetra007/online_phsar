export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function formatMoney(cents: unknown): string {
  const value = Number(cents)
  return `$${(Number.isFinite(value) ? value / 100 : 0).toFixed(2)}`
}

export function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function truncate(value: string, max = 3900): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return result === 0
}

export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => null)

  const body = await response?.json().catch(() => null)

  if (!response?.ok || !isRecord(body) || body.ok !== true) {
    const detail =
      isRecord(body) && typeof body.description === 'string'
        ? body.description
        : `HTTP ${response?.status ?? 'unavailable'}`
    throw new Error(`telegram: ${detail}`)
  }
}

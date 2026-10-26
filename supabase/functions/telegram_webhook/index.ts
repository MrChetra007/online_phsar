import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  escapeHtml,
  isRecord,
  safeEqual,
  sendTelegramMessage,
} from '../_shared/telegram.ts'

const helpText = [
  '👋 <b>ភ្ជាប់ហាងជាមួយ Telegram</b>',
  'សូមផ្ញើលេខកូដដែលបានបង្ហាញនៅក្នុងផ្ទាំងគ្រប់គ្រងហាង។',
  '',
  '<i>Send the code shown in your store dashboard.</i>',
].join('\n')

const invalidText = [
  '⚠️ លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់។',
  'សូមបង្កើតលេខកូដថ្មីក្នុងផ្ទាំងគ្រប់គ្រងហាង។',
  '',
  '<i>This code is invalid or expired. Generate a new code in your store dashboard.</i>',
].join('\n')

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function extractCode(text: string): string | null {
  const trimmed = text.trim()
  const start = /^\/start(?:@\w+)?(?:\s+(.+))?$/i.exec(trimmed)
  const raw = start ? (start[1] ?? '') : trimmed

  if (!raw || raw.startsWith('/')) return null

  const code = raw.trim().toUpperCase()
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null
}

function isHelpRequest(text: string): boolean {
  return /^\/(start|help)(?:@\w+)?\s*$/i.test(text.trim())
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ ok: false, reason: 'method_not_allowed' }, 405)
  }

  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  if (
    secret &&
    !safeEqual(
      request.headers.get('x-telegram-bot-api-secret-token') ?? '',
      secret,
    )
  ) {
    return json({ ok: false, reason: 'invalid_secret' }, 401)
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!botToken || !supabaseUrl || !serviceKey) {
    console.error('Telegram webhook is not configured')
    return json({ ok: false, reason: 'not_configured' }, 503)
  }

  let update: unknown
  try {
    update = await request.json()
  } catch {
    return json({ ok: false, reason: 'invalid_json' }, 400)
  }

  if (!isRecord(update) || !isRecord(update.message)) {
    return json({ ok: true })
  }

  const message = update.message
  const chat = isRecord(message.chat) ? message.chat : null
  const text = typeof message.text === 'string' ? message.text : null
  const chatId = chat && typeof chat.id === 'number' ? chat.id : null

  if (!chat || !text || chatId === null || chat.type !== 'private') {
    return json({ ok: true })
  }

  async function reply(value: string): Promise<void> {
    try {
      await sendTelegramMessage(botToken as string, chatId as number, value)
    } catch (error) {
      console.error(
        'Could not reply to Telegram chat',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  if (isHelpRequest(text)) {
    await reply(helpText)
    return json({ ok: true })
  }

  const code = extractCode(text)
  if (!code) {
    await reply(invalidText)
    return json({ ok: true })
  }

  const service = createClient(supabaseUrl, serviceKey)
  const { data, error } = await service.rpc('link_telegram_chat', {
    p_code: code,
    p_chat_id: chatId,
  })

  if (error) {
    console.error('Could not link Telegram chat', error.message)
    await reply(
      '⚠️ មានបញ្ហាក្នុងការភ្ជាប់។ សូមព្យាយាមម្តងទៀត។\n\n<i>Something went wrong. Please try again.</i>',
    )
    return json({ ok: true })
  }

  if (typeof data !== 'string' || data.length === 0) {
    await reply(invalidText)
    return json({ ok: true })
  }

  const storeName = escapeHtml(data)
  await reply(
    [
      `✅ បានភ្ជាប់ហាង <b>${storeName}</b> ដោយជោគជ័យ។`,
      'អ្នកនឹងទទួលបានការជូនដំណឹងអំពីការបញ្ជាទិញថ្មីនៅទីនេះ។',
      '',
      `<i>Connected to ${storeName}. New order alerts will arrive here.</i>`,
    ].join('\n'),
  )

  return json({ ok: true })
})

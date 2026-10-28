const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function getTelegramBotUsername(): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null

  const response = await fetch(
    `${supabaseUrl}/functions/v1/telegram_webhook`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        apikey: supabaseAnonKey,
      },
    },
  ).catch(() => null)

  if (!response?.ok) return null

  const body = (await response.json().catch(() => null)) as {
    bot_username?: unknown
  } | null

  return typeof body?.bot_username === 'string' && body.bot_username.length > 0
    ? body.bot_username
    : null
}

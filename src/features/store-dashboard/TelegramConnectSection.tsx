import { useEffect, useState } from 'react'
import { getTelegramBotUsername } from '../../api/config'
import {
  createTelegramLinkCode,
  getStoreTelegramChatId,
} from '../../api/stores'
import { Button } from '../../components/Button'
import { useI18n } from '../../lib/i18n'

export function TelegramConnectSection({
  storeId,
  telegramChatId,
}: {
  storeId: string
  telegramChatId: number | null
}) {
  const { t } = useI18n()
  const [connectedLocally, setConnectedLocally] = useState(false)
  const connected = connectedLocally || telegramChatId !== null
  const [waiting, setWaiting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [missingConfig, setMissingConfig] = useState(false)
  const [linkCode, setLinkCode] = useState<string | null>(null)

  useEffect(() => {
    if (!waiting) return

    let active = true
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1

      void getStoreTelegramChatId(storeId)
        .then((chatId) => {
          if (!active) return
          if (chatId !== null) {
            setConnectedLocally(true)
            setWaiting(false)
          }
        })
        .catch(() => undefined)

      if (attempts >= 40 && active) setWaiting(false)
    }, 3000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [waiting, storeId])

  async function connect() {
    if (loading || connected) return

    setLoading(true)
    setFailed(false)
    setMissingConfig(false)

    try {
      const code = await createTelegramLinkCode(storeId)
      setLinkCode(code)

      const bot = await getTelegramBotUsername()
      if (!bot) {
        setMissingConfig(true)
        return
      }

      window.open(`https://t.me/${bot}?start=${code}`, '_blank')
      setWaiting(true)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {t('storeTelegram.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {t('storeTelegram.subtitle')}
      </p>

      {failed ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {t('storeTelegram.error')}
        </p>
      ) : null}

      {missingConfig && linkCode ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            {t('storeTelegram.missingConfig')}
          </p>
          <CodeFallback code={linkCode} />
        </div>
      ) : null}

      {connected ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {t('storeTelegram.connected')}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {t('storeTelegram.connectedHint')}
          </p>
        </div>
      ) : waiting && linkCode ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {t('storeTelegram.waiting')}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {t('storeTelegram.waitingHint')}
          </p>
          <CodeFallback code={linkCode} />
        </div>
      ) : null}

      {connected ? null : (
        <Button
          className="mt-4"
          onClick={() => void connect()}
          disabled={loading}
          variant="primary"
        >
          {loading
            ? t('storeTelegram.generating')
            : waiting
              ? t('storeTelegram.openAgain')
              : t('storeTelegram.connect')}
        </Button>
      )}
    </div>
  )
}

function CodeFallback({ code }: { code: string }) {
  const { t } = useI18n()

  return (
    <div className="mt-3 border-t border-emerald-200/70 pt-3">
      <p className="text-xs font-medium text-emerald-800">
        {t('storeTelegram.code')}
      </p>
      <p className="mt-1 break-all font-mono text-xl font-bold tracking-widest text-emerald-900">
        {code}
      </p>
      <p className="mt-1 text-xs text-emerald-800">
        {t('storeTelegram.instructions')}
      </p>
    </div>
  )
}

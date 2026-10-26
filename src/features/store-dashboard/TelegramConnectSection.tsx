import { useState } from 'react'
import { createTelegramLinkCode } from '../../api/stores'
import { Button } from '../../components/Button'
import { useI18n } from '../../lib/i18n'

export function TelegramConnectSection({ storeId }: { storeId: string }) {
  const { t } = useI18n()
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function generateCode() {
    if (loading) return

    setLoading(true)
    setFailed(false)

    try {
      setCode(await createTelegramLinkCode(storeId))
    } catch {
      setFailed(true)
      setCode(null)
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

      {code ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {t('storeTelegram.code')}
          </p>
          <p className="mt-1 break-all font-mono text-2xl font-bold tracking-widest text-emerald-900">
            {code}
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            {t('storeTelegram.instructions')}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            {t('storeTelegram.codeHint')}
          </p>
        </div>
      ) : null}

      <Button
        className="mt-4"
        onClick={() => void generateCode()}
        disabled={loading}
        variant={code ? 'secondary' : 'primary'}
      >
        {loading ? t('storeTelegram.generating') : t('storeTelegram.connect')}
      </Button>
    </div>
  )
}

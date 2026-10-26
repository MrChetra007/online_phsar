import { useEffect, useState } from 'react'
import { listPlatformSettings, updatePlatformSetting } from '../../api/admin'
import { AdminNav } from './AdminNav'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { errorCodeFrom, getErrorMessage } from '../../lib/errors'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'

type SettingKind = 'number' | 'boolean' | 'text'

type SettingConfig = {
  key: string
  kind: SettingKind
  labelKey: TranslationKey
  hintKey?: TranslationKey
  default: string | number | boolean
  integer?: boolean
  min?: number
  max?: number
  required?: boolean
}

type SettingSection = {
  titleKey: TranslationKey
  settings: SettingConfig[]
}

const sections: SettingSection[] = [
  {
    titleKey: 'admin.settingsMoney',
    settings: [
      {
        key: 'commission_percent',
        kind: 'number',
        labelKey: 'setting.commission_percent',
        default: 30,
        integer: false,
        min: 0,
        max: 100,
      },
      {
        key: 'payout_hold_days',
        kind: 'number',
        labelKey: 'setting.payout_hold_days',
        default: 3,
        min: 0,
      },
      {
        key: 'return_window_days',
        kind: 'number',
        labelKey: 'setting.return_window_days',
        default: 3,
        min: 0,
      },
    ],
  },
  {
    titleKey: 'admin.settingsOrders',
    settings: [
      {
        key: 'store_ship_deadline_hours',
        kind: 'number',
        labelKey: 'setting.store_ship_deadline_hours',
        default: 48,
        min: 1,
      },
      {
        key: 'unpaid_qr_expiry_minutes',
        kind: 'number',
        labelKey: 'setting.unpaid_qr_expiry_minutes',
        default: 30,
        min: 1,
      },
      {
        key: 'cod_enabled',
        kind: 'boolean',
        labelKey: 'setting.cod_enabled',
        default: true,
      },
      {
        key: 'local_delivery_province',
        kind: 'text',
        labelKey: 'setting.local_delivery_province',
        hintKey: 'setting.localDeliveryHint',
        default: 'Battambang',
        required: true,
      },
    ],
  },
  {
    titleKey: 'admin.settingsShop',
    settings: [
      {
        key: 'shop_name',
        kind: 'text',
        labelKey: 'setting.shop_name',
        hintKey: 'setting.shopNameHint',
        default: '',
      },
      {
        key: 'shop_contact_phone',
        kind: 'text',
        labelKey: 'setting.shop_contact_phone',
        hintKey: 'setting.contactHint',
        default: '',
      },
    ],
  },
  {
    titleKey: 'admin.settingsAlerts',
    settings: [
      {
        key: 'admin_telegram_chat_id',
        kind: 'text',
        labelKey: 'setting.admin_telegram_chat_id',
        hintKey: 'setting.telegramHint',
        default: '',
      },
    ],
  },
  {
    titleKey: 'admin.settingsAvailability',
    settings: [
      {
        key: 'maintenance_mode',
        kind: 'boolean',
        labelKey: 'setting.maintenance_mode',
        hintKey: 'setting.maintenanceHint',
        default: false,
      },
    ],
  },
]

const allSettings = sections.flatMap((section) => section.settings)

type Values = Record<string, string | boolean>

function initialValue(setting: SettingConfig, raw: unknown): string | boolean {
  if (setting.kind === 'boolean') return raw === true
  if (raw === null || raw === undefined) return String(setting.default)
  return typeof raw === 'string' ? raw : String(raw)
}

export function AdminSettingsPage() {
  const { t, language } = useI18n()

  const [values, setValues] = useState<Values>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<TranslationKey | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    void listPlatformSettings()
      .then((rows) => {
        if (!active) return
        const byKey = new Map(rows.map((row) => [row.key, row.value]))
        const next: Values = {}
        for (const setting of allSettings) {
          next[setting.key] = initialValue(setting, byKey.get(setting.key))
        }
        setValues(next)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [version])

  function setValue(key: string, value: string | boolean) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    setNotice(null)
    setFormError(null)
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {}

    for (const setting of allSettings) {
      if (setting.kind === 'text' && setting.required) {
        if (String(values[setting.key] ?? '').trim() === '') {
          errors[setting.key] = t('admin.settingInvalid')
        }
        continue
      }

      if (setting.kind !== 'number') continue

      const raw = String(values[setting.key] ?? '').trim()
      const number = Number(raw)
      const min = setting.min ?? 0

      if (
        raw === '' ||
        !Number.isFinite(number) ||
        number < min ||
        (setting.max !== undefined && number > setting.max) ||
        (setting.integer !== false && !Number.isInteger(number))
      ) {
        errors[setting.key] = t('admin.settingInvalid')
      }
    }

    return errors
  }

  async function save() {
    if (busy) return

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError(t('admin.settingInvalid'))
      setNotice(null)
      return
    }

    setBusy(true)
    setFieldErrors({})
    setFormError(null)
    setNotice(null)

    try {
      await Promise.all(
        allSettings.map((setting) => {
          const raw = values[setting.key]
          const value: string | number | boolean =
            setting.kind === 'boolean'
              ? raw === true
              : setting.kind === 'number'
                ? Number(String(raw).trim())
                : String(raw ?? '').trim()

          return updatePlatformSetting(setting.key, value)
        }),
      )
      setNotice('admin.settingsSaved')
      setVersion((current) => current + 1)
    } catch (error) {
      setFormError(getErrorMessage(errorCodeFrom(error), language))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState />

  if (failed) {
    return (
      <ErrorState
        onRetry={() => {
          setFailed(false)
          setLoading(true)
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('admin.settingsTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('admin.settingsSubtitle')}
      </p>
      <AdminNav />

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t('admin.commissionWarning')}
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {formError}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
        >
          {t(notice)}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <div
            key={section.titleKey}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {t(section.titleKey)}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.settings.map((setting) => {
                const value = values[setting.key]
                const error = fieldErrors[setting.key]

                if (setting.kind === 'boolean') {
                  return (
                    <label
                      key={setting.key}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5"
                    >
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) =>
                          setValue(setting.key, event.target.checked)
                        }
                        className="mt-1 size-4 accent-emerald-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">
                          {t(setting.labelKey)}
                        </span>
                        {setting.hintKey ? (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {t(setting.hintKey)}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  )
                }

                return (
                  <Input
                    key={setting.key}
                    label={t(setting.labelKey)}
                    hint={setting.hintKey ? t(setting.hintKey) : undefined}
                    error={error}
                    type={setting.kind === 'number' ? 'number' : 'text'}
                    inputMode={
                      setting.kind === 'number' ? 'decimal' : undefined
                    }
                    min={setting.min}
                    max={setting.max}
                    step={setting.integer === false ? 'any' : 1}
                    value={String(value ?? '')}
                    onChange={(event) =>
                      setValue(setting.key, event.target.value)
                    }
                    disabled={busy}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? t('storeOrders.saving') : t('admin.saveSettings')}
        </Button>
      </div>
    </section>
  )
}

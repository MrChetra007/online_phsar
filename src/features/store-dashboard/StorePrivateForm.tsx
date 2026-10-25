import { useState, type FormEvent } from 'react'
import { updateStorePrivate, type StorePrivate } from '../../api/stores'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { isValidKhmerPhone, normalizePhone } from '../../lib/phone'
import { storeSaveErrorKey } from '../../lib/store'

export function StorePrivateForm({
  storeId,
  privateInfo,
  onUpdated,
}: {
  storeId: string
  privateInfo: StorePrivate | null
  onUpdated: (privateInfo: StorePrivate) => void
}) {
  const { t } = useI18n()

  const [contactPhone, setContactPhone] = useState(
    privateInfo?.contact_phone ?? '',
  )
  const [bankName, setBankName] = useState(privateInfo?.bank_name ?? '')
  const [bankAccountName, setBankAccountName] = useState(
    privateInfo?.bank_account_name ?? '',
  )
  const [bankAccountNumber, setBankAccountNumber] = useState(
    privateInfo?.bank_account_number ?? '',
  )
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [formError, setFormError] = useState<TranslationKey | null>(null)
  const [notice, setNotice] = useState<TranslationKey | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const trimmedPhone = contactPhone.trim()
    if (trimmedPhone && !isValidKhmerPhone(trimmedPhone)) {
      setPhoneError(t('store.privateErrorPhone'))
      return
    }
    setPhoneError(null)

    setSaving(true)
    try {
      const updated = await updateStorePrivate(storeId, {
        contactPhone: trimmedPhone ? normalizePhone(trimmedPhone) : '',
        bankName: bankName.trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
      })
      onUpdated(updated)
      setContactPhone(updated.contact_phone ?? '')
      setNotice('store.saved')
    } catch (error) {
      setFormError(storeSaveErrorKey(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {t('store.privateTitle')}
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        {t('store.privateSubtitle')}
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label={t('store.contactPhone')}
          name="contactPhone"
          type="tel"
          value={contactPhone}
          onChange={(event) => {
            setContactPhone(event.target.value)
            setPhoneError(null)
            setNotice(null)
            setFormError(null)
          }}
          error={phoneError ?? undefined}
          placeholder="012 345 678"
          autoComplete="tel"
        />

        <Input
          label={t('store.bankName')}
          name="bankName"
          value={bankName}
          onChange={(event) => {
            setBankName(event.target.value)
            setNotice(null)
            setFormError(null)
          }}
          maxLength={120}
        />
        <Input
          label={t('store.bankAccountName')}
          name="bankAccountName"
          value={bankAccountName}
          onChange={(event) => {
            setBankAccountName(event.target.value)
            setNotice(null)
            setFormError(null)
          }}
          maxLength={120}
        />
        <Input
          label={t('store.bankAccountNumber')}
          name="bankAccountNumber"
          value={bankAccountNumber}
          onChange={(event) => {
            setBankAccountNumber(event.target.value)
            setNotice(null)
            setFormError(null)
          }}
          maxLength={60}
          inputMode="numeric"
        />

        {formError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {t(formError)}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
          >
            {t(notice)}
          </p>
        ) : null}

        <Button type="submit" disabled={saving}>
          {saving ? t('common.loading') : t('store.save')}
        </Button>
      </form>
    </div>
  )
}

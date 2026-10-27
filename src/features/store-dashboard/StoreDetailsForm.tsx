import { useState, type FormEvent } from 'react'
import { updateStore, type Store } from '../../api/stores'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { useToast } from '../toast'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { centsToInput, parseMoneyToCents } from '../../lib/money'
import { storeSaveErrorKey } from '../../lib/store'

type Field =
  'name' | 'description' | 'province' | 'deliveryFeeLocal' | 'deliveryFeeOther'

type FieldErrors = Partial<Record<Field, string>>

export function StoreDetailsForm({
  store,
  disabled,
  onUpdated,
}: {
  store: Store
  disabled: boolean
  onUpdated: (store: Store) => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [name, setName] = useState(store.name)
  const [description, setDescription] = useState(store.description ?? '')
  const [province, setProvince] = useState(store.province ?? '')
  const [deliveryFeeLocal, setDeliveryFeeLocal] = useState(
    centsToInput(store.delivery_fee_local),
  )
  const [deliveryFeeOther, setDeliveryFeeOther] = useState(
    centsToInput(store.delivery_fee_other),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<TranslationKey | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const trimmedProvince = province.trim()
    const localCents = parseMoneyToCents(deliveryFeeLocal)
    const otherCents = parseMoneyToCents(deliveryFeeOther)

    const nextErrors: FieldErrors = {}
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      nextErrors.name = t('store.errorName')
    }
    if (trimmedDescription.length > 1000) {
      nextErrors.description = t('store.errorDescription')
    }
    if (trimmedProvince.length > 100) {
      nextErrors.province = t('store.errorProvince')
    }
    if (localCents === null) {
      nextErrors.deliveryFeeLocal = t('store.errorFee')
    }
    if (otherCents === null) {
      nextErrors.deliveryFeeOther = t('store.errorFee')
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const updated = await updateStore(store.id, {
        name: trimmedName,
        description: trimmedDescription,
        province: trimmedProvince,
        deliveryFeeLocal: localCents ?? 0,
        deliveryFeeOther: otherCents ?? 0,
      })
      onUpdated(updated)
      showToast(t('store.saved'), { tone: 'success' })
    } catch (error) {
      setFormError(storeSaveErrorKey(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {t('store.detailsTitle')}
      </h2>

      <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-800">{t('store.slug')}:</span>{' '}
        <code>/s/{store.slug}</code>
        <p className="mt-1 text-xs text-slate-500">{t('store.slugLocked')}</p>
      </div>

      {disabled ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          {t('store.lockedNote')}
        </p>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label={t('store.name')}
          name="storeName"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setFormError(null)
            setErrors((current) => ({ ...current, name: undefined }))
          }}
          error={errors.name}
          maxLength={80}
          disabled={disabled}
          required
        />

        <Textarea
          label={t('store.description')}
          name="storeDescription"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            setFormError(null)
            setErrors((current) => ({
              ...current,
              description: undefined,
            }))
          }}
          error={errors.description}
          hint={t('store.descriptionHint')}
          maxLength={1000}
          disabled={disabled}
        />

        <Input
          label={t('store.province')}
          name="storeProvince"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value)
            setFormError(null)
            setErrors((current) => ({ ...current, province: undefined }))
          }}
          error={errors.province}
          placeholder={t('store.provincePlaceholder')}
          maxLength={100}
          disabled={disabled}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`${t('store.deliveryLocal')} (USD)`}
            name="storeDeliveryFeeLocal"
            value={deliveryFeeLocal}
            onChange={(event) => {
              setDeliveryFeeLocal(event.target.value)
              setFormError(null)
              setErrors((current) => ({
                ...current,
                deliveryFeeLocal: undefined,
              }))
            }}
            error={errors.deliveryFeeLocal}
            hint={t('store.feeHint')}
            inputMode="decimal"
            disabled={disabled}
          />
          <Input
            label={`${t('store.deliveryOther')} (USD)`}
            name="storeDeliveryFeeOther"
            value={deliveryFeeOther}
            onChange={(event) => {
              setDeliveryFeeOther(event.target.value)
              setFormError(null)
              setErrors((current) => ({
                ...current,
                deliveryFeeOther: undefined,
              }))
            }}
            error={errors.deliveryFeeOther}
            hint={t('store.feeHint')}
            inputMode="decimal"
            disabled={disabled}
          />
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {t(formError)}
          </p>
        ) : null}
        {!disabled ? (
          <Button type="submit" disabled={saving}>
            {saving ? t('common.loading') : t('store.save')}
          </Button>
        ) : null}
      </form>
    </div>
  )
}

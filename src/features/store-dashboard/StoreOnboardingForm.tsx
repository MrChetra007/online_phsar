import { useState, type FormEvent } from 'react'
import { createStore } from '../../api/stores'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { useToast } from '../toast'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { parseMoneyToCents } from '../../lib/money'
import { isValidStoreSlug, slugify, storeSaveErrorKey } from '../../lib/store'

type Field =
  | 'name'
  | 'slug'
  | 'description'
  | 'province'
  | 'deliveryFeeLocal'
  | 'deliveryFeeOther'

type FieldErrors = Partial<Record<Field, string>>

export function StoreOnboardingForm({
  userId,
  onCreated,
}: {
  userId: string
  onCreated: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [province, setProvince] = useState('')
  const [deliveryFeeLocal, setDeliveryFeeLocal] = useState('0.00')
  const [deliveryFeeOther, setDeliveryFeeOther] = useState('0.00')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<TranslationKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    setErrors((current) => ({ ...current, name: undefined }))
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const trimmedName = name.trim()
    const cleanSlug = slug.trim().toLowerCase()
    const trimmedDescription = description.trim()
    const trimmedProvince = province.trim()
    const localCents = parseMoneyToCents(deliveryFeeLocal)
    const otherCents = parseMoneyToCents(deliveryFeeOther)

    const nextErrors: FieldErrors = {}
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      nextErrors.name = t('store.errorName')
    }
    if (!isValidStoreSlug(cleanSlug)) {
      nextErrors.slug = t('store.errorSlug')
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

    setSubmitting(true)
    try {
      await createStore(userId, {
        name: trimmedName,
        slug: cleanSlug,
        description: trimmedDescription,
        province: trimmedProvince,
        deliveryFeeLocal: localCents ?? 0,
        deliveryFeeOther: otherCents ?? 0,
        facebookUrl: '',
        telegramUsername: '',
      })
      showToast(t('store.created'), { tone: 'success' })
      onCreated()
    } catch (error) {
      const key = storeSaveErrorKey(error)
      if (key === 'store.errorSlugTaken') {
        setErrors((current) => ({ ...current, slug: t(key) }))
      } else {
        setFormError(key)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {t('store.onboardingTitle')}
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        {t('store.onboardingSubtitle')}
      </p>
      <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
        {t('store.liveNotice')}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label={t('store.name')}
          name="name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          error={errors.name}
          maxLength={80}
          autoComplete="organization"
          required
        />

        <div>
          <Input
            label={t('store.slug')}
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value.toLowerCase())
              setSlugTouched(true)
              setErrors((current) => ({ ...current, slug: undefined }))
            }}
            error={errors.slug}
            hint={t('store.slugHint')}
            maxLength={40}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          {isValidStoreSlug(slug) ? (
            <p className="mt-2 text-sm text-slate-500">
              {t('store.slugPreview')}: <code>/s/{slug}</code>
            </p>
          ) : null}
        </div>

        <Textarea
          label={t('store.description')}
          name="description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            setErrors((current) => ({ ...current, description: undefined }))
          }}
          error={errors.description}
          hint={t('store.descriptionHint')}
          maxLength={1000}
        />

        <Input
          label={t('store.province')}
          name="province"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value)
            setErrors((current) => ({ ...current, province: undefined }))
          }}
          error={errors.province}
          placeholder={t('store.provincePlaceholder')}
          maxLength={100}
          autoComplete="address-level1"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`${t('store.deliveryLocal')} (USD)`}
            name="deliveryFeeLocal"
            value={deliveryFeeLocal}
            onChange={(event) => {
              setDeliveryFeeLocal(event.target.value)
              setErrors((current) => ({
                ...current,
                deliveryFeeLocal: undefined,
              }))
            }}
            error={errors.deliveryFeeLocal}
            hint={t('store.feeHint')}
            inputMode="decimal"
          />
          <Input
            label={`${t('store.deliveryOther')} (USD)`}
            name="deliveryFeeOther"
            value={deliveryFeeOther}
            onChange={(event) => {
              setDeliveryFeeOther(event.target.value)
              setErrors((current) => ({
                ...current,
                deliveryFeeOther: undefined,
              }))
            }}
            error={errors.deliveryFeeOther}
            hint={t('store.feeHint')}
            inputMode="decimal"
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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t('common.loading') : t('store.createAction')}
        </Button>
      </form>
    </div>
  )
}

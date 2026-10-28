import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listActiveCategories, type Category } from '../../api/categories'
import {
  addProductImage,
  createProduct,
  createVariant,
  deleteProductImage,
  getMyProduct,
  getStoreCommissionPercent,
  productErrorKey,
  updateProduct,
  updateVariant,
  type ProductImage,
  type ProductStatus,
  type ProductWithDetails,
  type VariantInput,
} from '../../api/products'
import { getMyStore, type Store } from '../../api/stores'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { Select } from '../../components/Select'
import { Textarea } from '../../components/Textarea'
import {
  buildCategoryTree,
  categoryName,
  flattenCategoryTree,
} from '../../lib/categories'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { compressProductImage, validateProductImageFile } from '../../lib/image'
import { centsToInput, formatMoney, parseMoneyToCents } from '../../lib/money'
import { payoutCents } from '../../lib/products'
import { useAuth } from '../auth/context'
import { useToast } from '../toast'

type VariantDraft = {
  key: string
  id?: string
  label: string
  price: string
  stock: string
  sku: string
  isActive: boolean
}

type OptionValueDraft = {
  key: string
  label: string
}

type OptionGroupDraft = {
  key: string
  name: string
  values: OptionValueDraft[]
}

const optionPresets = {
  size: { nameKey: 'store.optionsPresetSize', values: ['S', 'M', 'L', 'XL'] },
  color: {
    nameKey: 'store.optionsPresetColor',
    values: ['Black', 'White', 'Red', 'Blue'],
  },
  custom: { nameKey: null, values: [] as string[] },
} as const

function combinationLabels(groups: OptionGroupDraft[]): string[] {
  const active = groups
    .map((group) =>
      group.values
        .map((value) => value.label.trim())
        .filter((label) => label.length > 0),
    )
    .filter((values) => values.length > 0)

  if (active.length === 0) return []

  let combinations: string[][] = [[]]
  for (const values of active) {
    combinations = combinations.flatMap((combination) =>
      values.map((value) => [...combination, value]),
    )
  }

  return combinations.map((combination) => combination.join(' / '))
}

function splitLabel(label: string): string[] {
  return label
    .split('/')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0)
}

function mergeCombinationVariants(
  labels: string[],
  current: VariantDraft[],
): VariantDraft[] {
  const byLabel = new Map(
    current.map((variant) => [variant.label.trim().toLowerCase(), variant]),
  )
  const existing = current.map((variant) => ({
    variant,
    parts: splitLabel(variant.label),
  }))

  return labels.map((label) => {
    const exact = byLabel.get(label.trim().toLowerCase())
    if (exact) return { ...exact, label }

    const parts = splitLabel(label)
    let matched: VariantDraft | null = null
    let matchedScore = 0

    for (const entry of existing) {
      if (entry.parts.length === 0) continue
      if (!entry.parts.every((part) => parts.includes(part))) continue
      if (entry.parts.length > matchedScore) {
        matched = entry.variant
        matchedScore = entry.parts.length
      }
    }

    return matched ? { ...matched, label } : blankVariant(label)
  })
}

type PendingImage = {
  key: string
  file: File
  previewUrl: string
}

type VariantFieldErrors = {
  label?: string
  price?: string
  stock?: string
}

type FormErrors = {
  name?: string
  category?: string
  description?: string
  variants?: string
  activeVariants?: string
  variantFields: Record<string, VariantFieldErrors>
}

function blankVariant(label = ''): VariantDraft {
  return {
    key: crypto.randomUUID(),
    label,
    price: '',
    stock: '0',
    sku: '',
    isActive: true,
  }
}

function variantToInput(variant: VariantDraft): VariantInput {
  const price = parseMoneyToCents(variant.price)
  if (price === null) throw new Error('INVALID_VARIANT_PRICE')

  return {
    label: variant.label.trim(),
    price,
    stock: Number(variant.stock),
    sku: variant.sku.trim(),
    isActive: variant.isActive,
  }
}

function toDraft(
  variant: ProductWithDetails['variants'][number],
): VariantDraft {
  return {
    key: variant.id,
    id: variant.id,
    label: variant.label,
    price: centsToInput(variant.price),
    stock: String(variant.stock),
    sku: variant.sku ?? '',
    isActive: variant.is_active,
  }
}

function emptyErrors(): FormErrors {
  return { variantFields: {} }
}

export function ProductEditorPage() {
  const { t, language } = useI18n()
  const { session } = useAuth()
  const { showToast } = useToast()
  const userId = session?.user.id
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const isNew = !productId

  const [store, setStore] = useState<Store | null>(null)
  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [commission, setCommission] = useState<number | null | undefined>(
    undefined,
  )
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProductStatus>('draft')
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>([])
  const [optionValueInputs, setOptionValueInputs] = useState<
    Record<string, string>
  >({})
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [errors, setErrors] = useState<FormErrors>(emptyErrors)
  const [formError, setFormError] = useState<TranslationKey | null>(null)
  const [imageError, setImageError] = useState<TranslationKey | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [notFoundKey, setNotFoundKey] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef<PendingImage[]>([])
  const defaultVariantLabelRef = useRef(t('store.defaultVariant'))
  const loadKey = `${productId ?? 'new'}:${version}`
  const loading = loadedKey !== loadKey
  const failed = failedKey === loadKey
  const notFound = notFoundKey === loadKey

  useEffect(() => {
    pendingRef.current = pendingImages
  }, [pendingImages])

  useEffect(() => {
    defaultVariantLabelRef.current = t('store.defaultVariant')
  }, [t])

  useEffect(() => {
    return () => {
      for (const pending of pendingRef.current) {
        URL.revokeObjectURL(pending.previewUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    const currentUserId = userId

    let active = true

    async function load() {
      try {
        const [storeData, categoryData, percent] = await Promise.all([
          getMyStore(currentUserId),
          listActiveCategories(),
          getStoreCommissionPercent().catch(() => null),
        ])

        if (!active) return
        if (!storeData) {
          navigate('/store', { replace: true })
          return
        }

        if (!productId) {
          setStore(storeData.store)
          setCategories(categoryData)
          setCommission(percent)
          setProduct(null)
          setName('')
          setCategoryId('')
          setDescription('')
          setStatus('draft')
          setVariants([blankVariant(defaultVariantLabelRef.current)])
          setOptionGroups([])
          setOptionValueInputs({})
          setOptionsError(null)
          setImages([])
          setPendingImages([])
          setErrors(emptyErrors())
          return
        }

        const productData = await getMyProduct(productId)
        if (!active) return
        if (!productData) {
          setNotFoundKey(loadKey)
          return
        }

        setStore(storeData.store)
        setCategories(categoryData)
        setCommission(percent)
        setProduct(productData)
        setName(productData.name)
        setCategoryId(productData.category_id ?? '')
        setDescription(productData.description ?? '')
        setStatus(productData.status)
        setVariants(
          productData.variants.length > 0
            ? productData.variants.map(toDraft)
            : [blankVariant(defaultVariantLabelRef.current)],
        )
        setImages(productData.images)
        setPendingImages([])
        setErrors(emptyErrors())
      } catch {
        if (active) setFailedKey(loadKey)
      } finally {
        if (active) setLoadedKey(loadKey)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [userId, productId, version, navigate, loadKey])

  const locked = store?.status === 'suspended'
  const categoryTree = flattenCategoryTree(buildCategoryTree(categories))
  const hasHiddenCategory =
    categoryId !== '' &&
    !categories.some((category) => category.id === categoryId)
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  )
  const previewVariant = variants.find((variant) => {
    if (!variant.isActive) return false
    const price = parseMoneyToCents(variant.price)
    return price !== null && price > 0
  })
  const previewPrice = previewVariant
    ? parseMoneyToCents(previewVariant.price)
    : null

  function updateVariantDraft(key: string, patch: Partial<VariantDraft>) {
    setVariants((current) =>
      current.map((variant) =>
        variant.key === key ? { ...variant, ...patch } : variant,
      ),
    )
    setFormError(null)
    setErrors((current) => ({
      ...current,
      variantFields: {
        ...current.variantFields,
        [key]: {},
      },
      variants: undefined,
      activeVariants: undefined,
    }))
  }

  function addVariant() {
    if (variants.length >= 20) return
    setVariants((current) => [...current, blankVariant()])
    setErrors((current) => ({ ...current, variants: undefined }))
  }

  function removeVariant(key: string) {
    setVariants((current) =>
      current.filter((variant) => variant.key !== key || variant.id),
    )
  }

  function applyOptions(next: OptionGroupDraft[]): boolean {
    const labels = combinationLabels(next)

    if (labels.length > 20) {
      setOptionsError(t('store.optionsLimit'))
      return false
    }

    setOptionsError(null)
    setOptionGroups(next)

    if (labels.length === 0) return true

    setVariants((current) => mergeCombinationVariants(labels, current))
    setErrors((current) => ({
      ...current,
      variants: undefined,
      activeVariants: undefined,
    }))
    return true
  }

  function addOptionGroup(kind: keyof typeof optionPresets) {
    if (optionGroups.length >= 3) return
    const preset = optionPresets[kind]

    applyOptions([
      ...optionGroups,
      {
        key: crypto.randomUUID(),
        name: preset.nameKey ? t(preset.nameKey) : '',
        values: preset.values.map((label) => ({
          key: crypto.randomUUID(),
          label,
        })),
      },
    ])
  }

  function renameOptionGroup(key: string, name: string) {
    setOptionGroups((current) =>
      current.map((group) => (group.key === key ? { ...group, name } : group)),
    )
  }

  function removeOptionGroup(key: string) {
    applyOptions(optionGroups.filter((group) => group.key !== key))
    setOptionValueInputs((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function addOptionValue(groupKey: string) {
    const value = (optionValueInputs[groupKey] ?? '').trim()
    if (!value) return

    const group = optionGroups.find((entry) => entry.key === groupKey)
    if (!group) return
    if (
      group.values.some(
        (entry) => entry.label.trim().toLowerCase() === value.toLowerCase(),
      )
    ) {
      return
    }

    const applied = applyOptions(
      optionGroups.map((entry) =>
        entry.key === groupKey
          ? {
              ...entry,
              values: [
                ...entry.values,
                { key: crypto.randomUUID(), label: value },
              ],
            }
          : entry,
      ),
    )
    if (applied) {
      setOptionValueInputs((current) => ({ ...current, [groupKey]: '' }))
    }
  }

  function removeOptionValue(groupKey: string, valueKey: string) {
    applyOptions(
      optionGroups.map((entry) =>
        entry.key === groupKey
          ? {
              ...entry,
              values: entry.values.filter((value) => value.key !== valueKey),
            }
          : entry,
      ),
    )
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setImageError(null)

    const available = 5 - images.length - pendingImages.length
    if (available <= 0) {
      setImageError('store.errorImagesMax')
      return
    }

    if (files.length > available) {
      setImageError('store.errorImagesMax')
    }

    const next: PendingImage[] = []
    for (const file of files.slice(0, available)) {
      const validationError = validateProductImageFile(file)
      if (validationError) {
        setImageError(validationError)
        continue
      }

      next.push({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }

    if (next.length > 0) {
      setPendingImages((current) => [...current, ...next])
    }
  }

  function removePendingImage(key: string) {
    setPendingImages((current) => {
      const target = current.find((pending) => pending.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((pending) => pending.key !== key)
    })
    setImageError(null)
  }

  async function removeImage(image: ProductImage) {
    if (!window.confirm(`${t('store.removeImage')}?`)) return

    setDeletingImageId(image.id)
    setImageError(null)

    try {
      await deleteProductImage(image)
      setImages((current) => current.filter((entry) => entry.id !== image.id))
    } catch {
      setImageError('store.errorImageRemove')
    } finally {
      setDeletingImageId(null)
    }
  }

  function validateForm(): boolean {
    const next = emptyErrors()
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    if (trimmedName.length < 2 || trimmedName.length > 150) {
      next.name = t('store.errorProductName')
    }
    if (categories.length > 0 && !categoryId) {
      next.category = t('store.errorProductCategory')
    }
    if (trimmedDescription.length > 4000) {
      next.description = t('store.errorProductDescription')
    }
    if (variants.length === 0) {
      next.variants = t('store.errorVariantRequired')
    }

    const seenLabels = new Set<string>()
    for (const variant of variants) {
      const fieldErrors: VariantFieldErrors = {}
      const label = variant.label.trim()
      const normalizedLabel = label.toLocaleLowerCase()

      if (label.length === 0 || label.length > 60) {
        fieldErrors.label = t('store.errorVariantLabel')
      } else if (seenLabels.has(normalizedLabel)) {
        fieldErrors.label = t('store.errorVariantDuplicate')
      } else {
        seenLabels.add(normalizedLabel)
      }

      const price = parseMoneyToCents(variant.price)
      if (price === null || price <= 0) {
        fieldErrors.price = t('store.errorVariantPrice')
      }

      const stockText = variant.stock.trim()
      const stock = stockText === '' ? Number.NaN : Number(stockText)
      if (!Number.isInteger(stock) || stock < 0) {
        fieldErrors.stock = t('store.errorVariantStock')
      }

      if (fieldErrors.label || fieldErrors.price || fieldErrors.stock) {
        next.variantFields[variant.key] = fieldErrors
      }
    }

    if (status === 'active' && !variants.some((variant) => variant.isActive)) {
      next.activeVariants = t('store.errorVariantActive')
    }

    setErrors(next)

    return (
      !next.name &&
      !next.category &&
      !next.description &&
      !next.variants &&
      !next.activeVariants &&
      Object.keys(next.variantFields).length === 0
    )
  }

  function applyServerProduct(next: ProductWithDetails) {
    setProduct(next)
    setImages(next.images)
    setVariants(
      next.variants.length > 0
        ? next.variants.map(toDraft)
        : [blankVariant(defaultVariantLabelRef.current)],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!store || locked || saving) return
    setFormError(null)
    setImageError(null)

    if (!validateForm()) return

    setSaving(true)
    setUploading(false)

    try {
      const productInput = {
        categoryId: categoryId || null,
        name: name.trim(),
        description: description.trim(),
        status,
      }

      const saved = product
        ? await updateProduct(product.id, productInput)
        : await createProduct({ storeId: store.id, ...productInput })

      for (const variant of variants) {
        const input = variantToInput(variant)
        if (variant.id) await updateVariant(variant.id, input)
        else await createVariant(saved.id, input)
      }

      let photoFailure = false
      if (pendingImages.length > 0) {
        setUploading(true)
        const remaining: PendingImage[] = []
        let uploadedCount = 0

        for (const pending of pendingImages) {
          try {
            const blob = await compressProductImage(pending.file)
            await addProductImage(
              store.id,
              saved.id,
              blob,
              images.length + uploadedCount,
            )
            uploadedCount += 1
            URL.revokeObjectURL(pending.previewUrl)
          } catch {
            photoFailure = true
            remaining.push(pending)
          }
        }

        setUploading(false)
        setPendingImages(remaining)
        if (photoFailure) setImageError('store.errorImageUpload')
      }

      showToast(t(photoFailure ? 'store.photosFailed' : 'store.productSaved'), {
        tone: photoFailure ? 'warning' : 'success',
      })

      if (isNew) {
        navigate(`/store/products/${saved.id}`, { replace: true })
        return
      }

      try {
        const refreshed = await getMyProduct(saved.id)
        if (refreshed) applyServerProduct(refreshed)
      } catch {
        setFormError('store.productError')
      }
    } catch (error) {
      setFormError(productErrorKey(error))
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  if (loading) return <LoadingState />
  if (failed) {
    return (
      <ErrorState
        onRetry={() => {
          setVersion((current) => current + 1)
        }}
      />
    )
  }
  if (notFound) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('store.productNotFound')}
        </h1>
        <Link
          to="/store/products"
          className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          {t('store.backToProducts')}
        </Link>
      </section>
    )
  }
  if (!store) return <LoadingState />

  return (
    <section className="mx-auto max-w-3xl">
      <Link
        to="/store/products"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        ← {t('store.backToProducts')}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
        {isNew ? t('store.newProductTitle') : t('store.editProductTitle')}
      </h1>

      {locked ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          {t('store.productLocked')}
        </p>
      ) : null}

      {formError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {t(formError)}
        </p>
      ) : null}
      <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-4">
            <Input
              label={t('store.productName')}
              name="productName"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setFormError(null)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              error={errors.name}
              maxLength={150}
              disabled={locked || saving}
              required
            />

            <Select
              label={t('store.productCategory')}
              name="productCategory"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setFormError(null)
                setErrors((current) => ({
                  ...current,
                  category: undefined,
                }))
              }}
              error={errors.category}
              hint={
                selectedCategory?.requires_size
                  ? t('store.requiresSizeHint')
                  : undefined
              }
              disabled={locked || saving}
            >
              {categories.length === 0 ? (
                <option value="">{t('store.uncategorized')}</option>
              ) : (
                <option value="">{t('store.selectCategory')}</option>
              )}
              {hasHiddenCategory ? (
                <option value={categoryId}>{t('store.hiddenCategory')}</option>
              ) : null}
              {categoryTree.map(({ category, depth }) => (
                <option key={category.id} value={category.id}>
                  {'— '.repeat(depth)}
                  {categoryName(category, language)}
                </option>
              ))}
            </Select>

            <Textarea
              label={t('store.productDescription')}
              name="productDescription"
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
              hint={t('store.productDescriptionHint')}
              maxLength={4000}
              rows={5}
              disabled={locked || saving}
            />

            <Select
              label={t('store.productVisibility')}
              name="productStatus"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ProductStatus)
                setFormError(null)
                setErrors((current) => ({
                  ...current,
                  activeVariants: undefined,
                }))
              }}
              disabled={locked || saving}
            >
              <option value="draft">{t('product.statusDraft')}</option>
              <option value="active">{t('product.statusActive')}</option>
              <option value="hidden">{t('product.statusHidden')}</option>
            </Select>
          </div>
        </div>

        {isNew ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t('store.options')}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t('store.optionsHint')}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addOptionGroup('size')}
                disabled={locked || saving || optionGroups.length >= 3}
              >
                + {t('store.optionsPresetSize')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addOptionGroup('color')}
                disabled={locked || saving || optionGroups.length >= 3}
              >
                + {t('store.optionsPresetColor')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addOptionGroup('custom')}
                disabled={locked || saving || optionGroups.length >= 3}
              >
                + {t('store.optionsPresetCustom')}
              </Button>
            </div>

            {optionsError ? (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {optionsError}
              </p>
            ) : null}

            {optionGroups.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t('store.optionsEmpty')}
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {optionGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-xl border border-slate-200 p-3.5"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        label={t('store.optionsGroupName')}
                        name={`option-name-${group.key}`}
                        value={group.name}
                        onChange={(event) =>
                          renameOptionGroup(group.key, event.target.value)
                        }
                        placeholder={t('store.optionsGroupNamePlaceholder')}
                        maxLength={40}
                        disabled={locked || saving}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOptionGroup(group.key)}
                      disabled={locked || saving}
                      className="mt-7 shrink-0 text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      {t('store.optionsRemoveGroup')}
                    </button>
                  </div>

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {t('store.optionsValues')}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.values.map((value) => (
                      <span
                        key={value.key}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
                      >
                        {value.label}
                        <button
                          type="button"
                          onClick={() =>
                            removeOptionValue(group.key, value.key)
                          }
                          disabled={locked || saving}
                          aria-label={t('store.optionsRemoveValue')}
                          className="grid size-4 place-items-center rounded-full text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {group.values.length === 0 ? (
                      <span className="text-sm text-slate-500">
                        {t('store.optionsNoValues')}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      value={optionValueInputs[group.key] ?? ''}
                      onChange={(event) =>
                        setOptionValueInputs((current) => ({
                          ...current,
                          [group.key]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addOptionValue(group.key)
                        }
                      }}
                      placeholder={t('store.optionsValuePlaceholder')}
                      maxLength={40}
                      disabled={locked || saving}
                      className="block w-full rounded-2xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100/70"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addOptionValue(group.key)}
                      disabled={
                        locked ||
                        saving ||
                        (optionValueInputs[group.key] ?? '').trim().length === 0
                      }
                    >
                      {t('store.optionsAddValue')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {combinationLabels(optionGroups).length > 0 ? (
              <p className="mt-3 text-sm text-emerald-700">
                {combinationLabels(optionGroups).length} / 20{' '}
                {t('store.optionsCombinations')}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t('store.variants')}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t('store.variantsHint')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={addVariant}
              disabled={locked || saving || variants.length >= 20}
            >
              {t('store.addVariant')}
            </Button>
          </div>

          {errors.variants ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {errors.variants}
            </p>
          ) : null}
          {errors.activeVariants ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {errors.activeVariants}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {variants.map((variant) => {
              const fieldErrors = errors.variantFields[variant.key] ?? {}
              const messages = [
                ...new Set(
                  [
                    fieldErrors.label,
                    fieldErrors.price,
                    fieldErrors.stock,
                  ].filter((message): message is string => Boolean(message)),
                ),
              ]

              return (
                <div
                  key={variant.key}
                  className="rounded-xl border border-slate-200 p-3.5"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={t('store.variantLabel')}
                      name={`variant-label-${variant.key}`}
                      value={variant.label}
                      onChange={(event) =>
                        updateVariantDraft(variant.key, {
                          label: event.target.value,
                        })
                      }
                      maxLength={60}
                      disabled={locked || saving}
                    />
                    <Input
                      label={t('store.variantPrice')}
                      name={`variant-price-${variant.key}`}
                      value={variant.price}
                      onChange={(event) =>
                        updateVariantDraft(variant.key, {
                          price: event.target.value,
                        })
                      }
                      inputMode="decimal"
                      disabled={locked || saving}
                    />
                    <Input
                      label={t('store.variantStock')}
                      name={`variant-stock-${variant.key}`}
                      value={variant.stock}
                      onChange={(event) =>
                        updateVariantDraft(variant.key, {
                          stock: event.target.value,
                        })
                      }
                      inputMode="numeric"
                      disabled={locked || saving}
                    />
                    <Input
                      label={t('store.variantSku')}
                      name={`variant-sku-${variant.key}`}
                      value={variant.sku}
                      onChange={(event) =>
                        updateVariantDraft(variant.key, {
                          sku: event.target.value,
                        })
                      }
                      maxLength={64}
                      disabled={locked || saving}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={variant.isActive}
                        onChange={(event) =>
                          updateVariantDraft(variant.key, {
                            isActive: event.target.checked,
                          })
                        }
                        disabled={locked || saving}
                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      {t('store.variantActive')}
                    </label>

                    {variant.id ? null : (
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.key)}
                        disabled={locked || saving}
                        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                      >
                        {t('store.removeVariant')}
                      </button>
                    )}
                  </div>

                  {messages.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {messages.map((message) => (
                        <p key={message} className="text-sm text-red-600">
                          {message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('store.images')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{t('store.imagesHint')}</p>

          {imageError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {t(imageError)}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <img
                  src={image.url}
                  alt=""
                  className="size-24 rounded-xl border border-slate-200 object-cover"
                />
                {locked ? null : (
                  <button
                    type="button"
                    onClick={() => void removeImage(image)}
                    disabled={saving || deletingImageId === image.id}
                    aria-label={t('store.removeImage')}
                    className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-red-600 text-xs text-white shadow disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {pendingImages.map((pending) => (
              <div key={pending.key} className="relative">
                <img
                  src={pending.previewUrl}
                  alt=""
                  className="size-24 rounded-xl border border-dashed border-emerald-400 object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {t('store.pendingPhoto')}
                </span>
                {locked ? null : (
                  <button
                    type="button"
                    onClick={() => removePendingImage(pending.key)}
                    disabled={saving}
                    aria-label={t('store.removeImage')}
                    className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-red-600 text-xs text-white shadow disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {images.length === 0 && pendingImages.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t('store.noImages')}</p>
          ) : null}

          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                locked || saving || images.length + pendingImages.length >= 5
              }
            >
              {t('store.addImages')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-emerald-900">
            {t('store.payoutPreview')}
          </h2>
          {commission === undefined ? (
            <p className="mt-2 text-sm text-emerald-800">
              {t('common.loading')}
            </p>
          ) : commission === null ? (
            <p className="mt-2 text-sm text-emerald-800">
              {t('store.previewUnavailable')}
            </p>
          ) : (
            <div className="mt-2 space-y-1 text-sm text-emerald-800">
              <p>
                {t('store.commissionLabel')}:{' '}
                <span className="font-semibold">{commission}%</span>
              </p>
              {previewPrice !== null ? (
                <p>
                  {formatMoney(previewPrice)} →{' '}
                  <span className="font-semibold">
                    {formatMoney(payoutCents(previewPrice, commission))}
                  </span>
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={locked || saving}>
            {saving
              ? uploading
                ? t('store.uploadingPhotos')
                : t('common.loading')
              : t('store.saveProduct')}
          </Button>
          <Link
            to="/store/products"
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </section>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import {
  categoryErrorKey,
  createCategory,
  listAllCategories,
  updateCategory,
  type Category,
  type CategoryInput,
} from '../../api/categories'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { Select } from '../../components/Select'
import {
  buildCategoryTree,
  categoryName,
  descendantCategoryIds,
  flattenCategoryTree,
} from '../../lib/categories'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { useToast } from '../toast'

function compareCategories(a: Category, b: Category): number {
  return a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en)
}

function CategoryForm({
  categories,
  initial,
  defaultSortOrder,
  busy,
  onSubmit,
  onCancel,
}: {
  categories: Category[]
  initial?: Category
  defaultSortOrder: number
  busy: boolean
  onSubmit: (input: CategoryInput) => void
  onCancel?: () => void
}) {
  const { t, language } = useI18n()
  const [nameKm, setNameKm] = useState(initial?.name_km ?? '')
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '')
  const [parentId, setParentId] = useState(initial?.parent_id ?? '')
  const [sortOrder, setSortOrder] = useState(
    String(initial?.sort_order ?? defaultSortOrder),
  )
  const [requiresSize, setRequiresSize] = useState(
    initial?.requires_size ?? false,
  )
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [localError, setLocalError] = useState<TranslationKey | null>(null)

  const excluded = initial
    ? new Set([initial.id, ...descendantCategoryIds(categories, initial.id)])
    : new Set<string>()
  const parentOptions = flattenCategoryTree(
    buildCategoryTree(
      categories.filter((category) => !excluded.has(category.id)),
    ),
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    const trimmedKm = nameKm.trim()
    const trimmedEn = nameEn.trim()
    if (!trimmedKm || !trimmedEn) {
      setLocalError('admin.categoryNameRequired')
      return
    }

    const sort = Number(sortOrder)
    if (!Number.isInteger(sort) || sort < 0) {
      setLocalError('admin.categorySortError')
      return
    }

    onSubmit({
      nameKm: trimmedKm,
      nameEn: trimmedEn,
      parentId: parentId || null,
      sortOrder: sort,
      requiresSize,
      isActive,
    })
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {initial ? t('admin.edit') : t('admin.addCategory')}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input
          label={t('admin.nameKm')}
          name="categoryNameKm"
          value={nameKm}
          onChange={(event) => {
            setNameKm(event.target.value)
            setLocalError(null)
          }}
          disabled={busy}
          required
        />
        <Input
          label={t('admin.nameEn')}
          name="categoryNameEn"
          value={nameEn}
          onChange={(event) => {
            setNameEn(event.target.value)
            setLocalError(null)
          }}
          disabled={busy}
          required
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select
          label={t('admin.parentCategory')}
          name="categoryParent"
          value={parentId}
          onChange={(event) => {
            setParentId(event.target.value)
            setLocalError(null)
          }}
          disabled={busy}
        >
          <option value="">{t('admin.noParent')}</option>
          {parentOptions.map(({ category, depth }) => (
            <option key={category.id} value={category.id}>
              {'— '.repeat(depth)}
              {categoryName(category, language)}
            </option>
          ))}
        </Select>

        <Input
          label={t('admin.sortOrder')}
          name="categorySortOrder"
          type="number"
          min={0}
          step={1}
          value={sortOrder}
          onChange={(event) => {
            setSortOrder(event.target.value)
            setLocalError(null)
          }}
          disabled={busy}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={requiresSize}
            onChange={(event) => setRequiresSize(event.target.checked)}
            disabled={busy}
            className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          {t('admin.requiresSize')}
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={busy}
            className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          {t('admin.visible')}
        </label>
      </div>

      {localError ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {t(localError)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy
            ? t('common.loading')
            : initial
              ? t('admin.saveCategory')
              : t('admin.addCategory')}
        </Button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-sm font-medium text-slate-600 hover:underline disabled:opacity-50"
          >
            {t('admin.cancel')}
          </button>
        ) : null}
      </div>
    </form>
  )
}

export function AdminCategoriesPage() {
  const { t, language } = useI18n()
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [actionError, setActionError] = useState<TranslationKey | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addFormKey, setAddFormKey] = useState(0)

  useEffect(() => {
    let active = true

    void listAllCategories()
      .then((next) => {
        if (active) setCategories(next)
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

  const tree = buildCategoryTree(categories)
  const flat = flattenCategoryTree(tree)
  const defaultSortOrder =
    categories.reduce(
      (maximum, category) => Math.max(maximum, category.sort_order),
      0,
    ) + 1

  async function handleCreate(input: CategoryInput) {
    setFormBusy(true)
    setActionError(null)
    try {
      await createCategory(input)
      showToast(t('admin.categorySaved'), { tone: 'success' })
      setAddFormKey((current) => current + 1)
      setVersion((current) => current + 1)
    } catch (error) {
      setActionError(categoryErrorKey(error))
    } finally {
      setFormBusy(false)
    }
  }

  async function handleUpdate(categoryId: string, input: CategoryInput) {
    setFormBusy(true)
    setActionError(null)
    try {
      await updateCategory(categoryId, input)
      showToast(t('admin.categorySaved'), { tone: 'success' })
      setEditingId(null)
      setVersion((current) => current + 1)
    } catch (error) {
      setActionError(categoryErrorKey(error))
    } finally {
      setFormBusy(false)
    }
  }

  async function toggleCategory(category: Category) {
    setBusyId(category.id)
    setActionError(null)
    try {
      const updated = await updateCategory(category.id, {
        isActive: !category.is_active,
      })
      setCategories((current) =>
        current.map((entry) => (entry.id === category.id ? updated : entry)),
      )
      showToast(t('admin.categorySaved'), { tone: 'success' })
    } catch (error) {
      setActionError(categoryErrorKey(error))
    } finally {
      setBusyId(null)
    }
  }

  async function moveCategory(category: Category, direction: -1 | 1) {
    const siblings = categories
      .filter((entry) => entry.parent_id === category.parent_id)
      .sort(compareCategories)
    const index = siblings.findIndex((entry) => entry.id === category.id)
    const targetIndex = index + direction
    if (index === -1 || targetIndex < 0 || targetIndex >= siblings.length) {
      return
    }

    const ordered = [...siblings]
    const current = ordered[index]
    ordered[index] = ordered[targetIndex]
    ordered[targetIndex] = current

    setBusyId(category.id)
    setActionError(null)
    try {
      await Promise.all(
        ordered.map((entry, position) =>
          entry.sort_order === position + 1
            ? Promise.resolve()
            : updateCategory(entry.id, { sortOrder: position + 1 }),
        ),
      )
      showToast(t('admin.categorySaved'), { tone: 'success' })
      setVersion((currentVersion) => currentVersion + 1)
    } catch (error) {
      setActionError(categoryErrorKey(error))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState />
  if (failed) {
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true)
          setFailed(false)
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('admin.categoriesTitle')}
      </h1>
      <p className="mt-2 text-slate-600">{t('admin.categoriesSubtitle')}</p>

      {actionError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {t(actionError)}
        </p>
      ) : null}
      <div className="mt-5">
        <CategoryForm
          key={addFormKey}
          categories={categories}
          defaultSortOrder={defaultSortOrder}
          busy={formBusy}
          onSubmit={(input) => void handleCreate(input)}
        />
      </div>

      <div className="mt-7">
        {flat.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            {t('admin.categoryEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {flat.map(({ category, depth }) => {
              const siblings = categories
                .filter((entry) => entry.parent_id === category.parent_id)
                .sort(compareCategories)
              const index = siblings.findIndex(
                (entry) => entry.id === category.id,
              )
              const canMoveUp = index > 0
              const canMoveDown = index < siblings.length - 1
              const otherName =
                language === 'km' ? category.name_en : category.name_km

              return (
                <li key={category.id} style={{ marginLeft: `${depth * 16}px` }}>
                  {editingId === category.id ? (
                    <CategoryForm
                      key={`edit-${category.id}`}
                      categories={categories}
                      initial={category}
                      defaultSortOrder={defaultSortOrder}
                      busy={formBusy}
                      onSubmit={(input) =>
                        void handleUpdate(category.id, input)
                      }
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {categoryName(category, language)}
                          </p>
                          {category.is_active ? null : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              {t('admin.hidden')}
                            </span>
                          )}
                          {category.requires_size ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {t('admin.requiresSize')}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {otherName} · /{category.slug}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(category.id)}
                          disabled={formBusy || busyId !== null}
                          className="rounded-lg px-2.5 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {t('admin.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleCategory(category)}
                          disabled={formBusy || busyId !== null}
                          className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {category.is_active
                            ? t('admin.hide')
                            : t('admin.show')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveCategory(category, -1)}
                          disabled={!canMoveUp || formBusy || busyId !== null}
                          aria-label={t('admin.moveUp')}
                          className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveCategory(category, 1)}
                          disabled={!canMoveDown || formBusy || busyId !== null}
                          aria-label={t('admin.moveDown')}
                          className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

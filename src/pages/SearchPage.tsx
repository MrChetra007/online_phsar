import { useEffect, useMemo, useState, useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listActiveCategories, type Category } from '../api/categories'
import { listPublicProducts, type PublicProduct } from '../api/catalog'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { SearchBar } from '../components/SearchBar'
import {
  buildCategoryTree,
  categoryName,
  descendantCategoryIds,
  flattenCategoryTree,
} from '../lib/categories'
import { useI18n } from '../lib/i18n'
import { parseMoneyToCents } from '../lib/money'
import { normalizeSearchQuery } from '../lib/search'

type SearchState = {
  requestKey: string
  status: 'ready' | 'error'
  products: PublicProduct[]
}

type SortOption = 'newest' | 'price-asc' | 'price-desc'

const PRODUCT_LIMIT = 120

function productMinPrice(product: PublicProduct): number {
  return Math.min(...product.variants.map((variant) => variant.price))
}

function productMaxPrice(product: PublicProduct): number {
  return Math.max(...product.variants.map((variant) => variant.price))
}

type SearchFilterPanelProps = {
  categories: Category[]
  categoryId: string
  onCategoryChange: (categoryId: string) => void
  minPrice: string
  maxPrice: string
  onMinPriceChange: (value: string) => void
  onMaxPriceChange: (value: string) => void
  inStockOnly: boolean
  onInStockOnlyChange: (value: boolean) => void
  activeCount: number
  onClear: () => void
}

function SearchFilterPanel({
  categories,
  categoryId,
  onCategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  inStockOnly,
  onInStockOnlyChange,
  activeCount,
  onClear,
}: SearchFilterPanelProps) {
  const { t, language } = useI18n()
  const priceIds = useId()
  const flatCategories = flattenCategoryTree(buildCategoryTree(categories))

  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">
          {t('search.filters')}
        </h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            {t('search.clearFilters')}
          </button>
        ) : null}
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t('search.category')}
        </legend>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            aria-pressed={categoryId === ''}
            onClick={() => onCategoryChange('')}
            className={[
              'w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
              categoryId === ''
                ? 'bg-emerald-700 text-white'
                : 'text-slate-700 hover:bg-stone-100',
            ].join(' ')}
          >
            {t('search.allCategories')}
          </button>
          {flatCategories.map(({ category, depth }) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => onCategoryChange(category.id)}
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              className={[
                'w-full rounded-xl py-2 pr-3 text-left text-sm font-medium transition-colors',
                categoryId === category.id
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-700 hover:bg-stone-100',
              ].join(' ')}
            >
              {categoryName(category, language)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t('search.price')}
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor={`${priceIds}-min`}
              className="text-xs font-medium text-slate-600"
            >
              {t('search.min')}
            </label>
            <input
              id={`${priceIds}-min`}
              value={minPrice}
              onChange={(event) => onMinPriceChange(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              maxLength={10}
              className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100/70"
            />
          </div>
          <div>
            <label
              htmlFor={`${priceIds}-max`}
              className="text-xs font-medium text-slate-600"
            >
              {t('search.max')}
            </label>
            <input
              id={`${priceIds}-max`}
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              inputMode="decimal"
              placeholder="—"
              maxLength={10}
              className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100/70"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t('search.availability')}
        </legend>
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => onInStockOnlyChange(event.target.checked)}
            className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          {t('search.inStockOnly')}
        </label>
      </fieldset>
    </div>
  )
}

export function SearchPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const query = normalizeSearchQuery(searchParams.get('q') ?? '')
  const [version, setVersion] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [state, setState] = useState<SearchState>({
    requestKey: '',
    status: 'ready',
    products: [],
  })

  const [categoryId, setCategoryId] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<SortOption>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let active = true

    void listActiveCategories()
      .then((items) => {
        if (active) setCategories(items)
      })
      .catch(() => {
        if (active) setCategories([])
      })

    return () => {
      active = false
    }
  }, [])

  const categoryIds = useMemo(() => {
    if (!categoryId) return undefined
    return [categoryId, ...descendantCategoryIds(categories, categoryId)]
  }, [categoryId, categories])

  useEffect(() => {
    let active = true
    const requestKey = `${query}:${categoryId}:${version}`

    void listPublicProducts({
      query,
      categoryIds,
      limit: PRODUCT_LIMIT,
    })
      .then((products) => {
        if (active) {
          setState({ requestKey, status: 'ready', products })
        }
      })
      .catch(() => {
        if (active) {
          setState({ requestKey, status: 'error', products: [] })
        }
      })

    return () => {
      active = false
    }
  }, [query, categoryId, categoryIds, version])

  const requestKey = `${query}:${categoryId}:${version}`
  const loading = state.requestKey !== requestKey

  const minCents = parseMoneyToCents(minPrice)
  const maxCents = parseMoneyToCents(maxPrice)

  const products = useMemo(() => {
    let items = state.products

    if (inStockOnly) {
      items = items.filter((product) =>
        product.variants.some((variant) => variant.stock > 0),
      )
    }
    if (minCents !== null) {
      items = items.filter((product) => productMinPrice(product) >= minCents)
    }
    if (maxCents !== null) {
      items = items.filter((product) => productMinPrice(product) <= maxCents)
    }

    const sorted = [...items]
    if (sort === 'price-asc') {
      sorted.sort((a, b) => productMinPrice(a) - productMinPrice(b))
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => productMaxPrice(b) - productMaxPrice(a))
    }

    return sorted
  }, [state.products, inStockOnly, minCents, maxCents, sort])

  const activeFilterCount = [
    categoryId !== '',
    minPrice.trim() !== '',
    maxPrice.trim() !== '',
    inStockOnly,
    sort !== 'newest',
  ].filter(Boolean).length

  function clearFilters() {
    setCategoryId('')
    setMinPrice('')
    setMaxPrice('')
    setInStockOnly(false)
    setSort('newest')
  }

  const filterPanel = (
    <SearchFilterPanel
      categories={categories}
      categoryId={categoryId}
      onCategoryChange={setCategoryId}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPriceChange={setMinPrice}
      onMaxPriceChange={setMaxPrice}
      inStockOnly={inStockOnly}
      onInStockOnlyChange={setInStockOnly}
      activeCount={activeFilterCount}
      onClear={clearFilters}
    />
  )

  return (
    <section>
      <div className="rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          {t('nav.shop')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t('search.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{t('search.subtitle')}</p>
        <SearchBar
          key={query}
          initialQuery={query}
          className="mt-6 max-w-2xl"
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {query ? (
                  <>
                    {t('search.resultsFor')}{' '}
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      “{query}”
                    </span>
                  </>
                ) : (
                  t('search.browseTitle')
                )}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {products.length} {t('search.productsLabel')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50 lg:hidden"
              >
                {t('search.filters')}
                {activeFilterCount > 0 ? (
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <span className="hidden sm:inline">{t('search.sort')}</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SortOption)
                  }
                  aria-label={t('search.sort')}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="newest">{t('search.sortNewest')}</option>
                  <option value="price-asc">{t('search.sortPriceAsc')}</option>
                  <option value="price-desc">
                    {t('search.sortPriceDesc')}
                  </option>
                </select>
              </label>
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-4 lg:hidden">{filterPanel}</div>
          ) : null}

          <div className="mt-5">
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : state.status === 'error' ? (
              <ErrorState
                onRetry={() => setVersion((current) => current + 1)}
                message={t('search.error')}
              />
            ) : products.length === 0 ? (
              <div className="space-y-3">
                <EmptyState>
                  {activeFilterCount > 0
                    ? t('search.filterEmpty')
                    : t('search.noResults')}
                </EmptyState>
                {activeFilterCount > 0 ? (
                  <div className="text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearFilters}
                    >
                      {t('search.clearFilters')}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <ProductGrid products={products} showStore />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

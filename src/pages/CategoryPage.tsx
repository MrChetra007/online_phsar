import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getActiveCategoryBySlug,
  listActiveCategories,
  type Category,
} from '../api/categories'
import { listPublicProducts, type PublicProduct } from '../api/catalog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { Skeleton } from '../components/Skeleton'
import { categoryName, descendantCategoryIds } from '../lib/categories'
import { useI18n } from '../lib/i18n'

type CategoryState = {
  requestKey: string
  status: 'ready' | 'error'
  category: Category | null
  categories: Category[]
  products: PublicProduct[]
}

export function CategoryPage() {
  const { t, language } = useI18n()
  const { slug } = useParams<{ slug: string }>()
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<CategoryState>({
    requestKey: '',
    status: 'ready',
    category: null,
    categories: [],
    products: [],
  })

  useEffect(() => {
    if (!slug) return

    const currentSlug = slug
    let active = true
    const requestKey = `${currentSlug}:${version}`

    async function load() {
      try {
        const [nextCategory, allCategories] = await Promise.all([
          getActiveCategoryBySlug(currentSlug),
          listActiveCategories(),
        ])

        if (!active) return

        if (!nextCategory) {
          setState({
            requestKey,
            status: 'ready',
            category: null,
            categories: allCategories,
            products: [],
          })
          return
        }

        const categoryIds = [
          nextCategory.id,
          ...descendantCategoryIds(allCategories, nextCategory.id),
        ]
        const products = await listPublicProducts({ categoryIds })

        if (!active) return

        setState({
          requestKey,
          status: 'ready',
          category: nextCategory,
          categories: allCategories,
          products,
        })
      } catch {
        if (!active) return
        setState({
          requestKey,
          status: 'error',
          category: null,
          categories: [],
          products: [],
        })
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [slug, version])

  if (!slug) return null

  const requestKey = `${slug}:${version}`

  if (state.requestKey !== requestKey) {
    return (
      <div>
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="mt-3 h-9 w-56 rounded" />
        <div className="mt-6">
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        onRetry={() => setVersion((current) => current + 1)}
        message={t('category.error')}
      />
    )
  }

  if (!state.category) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          {t('category.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('category.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {t('common.backHome')}
        </Link>
      </section>
    )
  }

  const category = state.category
  const children = state.categories.filter(
    (item) => item.parent_id === category.id,
  )

  return (
    <section>
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link to="/" className="hover:text-emerald-700">
          {t('nav.home')}
        </Link>
        <span className="px-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-slate-700">
          {categoryName(category, language)}
        </span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
        {categoryName(category, language)}
      </h1>

      {children.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {children.map((child) => (
            <Link
              key={child.id}
              to={`/c/${child.slug}`}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
            >
              {categoryName(child, language)}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
          {t('publicStore.productsTitle')}
        </h2>
        <div className="mt-3">
          {state.products.length === 0 ? (
            <EmptyState>{t('category.empty')}</EmptyState>
          ) : (
            <ProductGrid products={state.products} showStore />
          )}
        </div>
      </div>
    </section>
  )
}

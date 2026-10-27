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
import { ArrowRightIcon } from '../components/icons'
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
        <Skeleton className="mt-4 h-52 w-full rounded-[2rem]" />
        <div className="mt-8">
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
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-2xl font-bold text-emerald-700 shadow-sm">
          ?
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('category.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('category.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t('common.backHome')}
          <ArrowRightIcon className="size-4" />
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

      <div className="relative mt-4 overflow-hidden rounded-[2rem] bg-ink text-white shadow-lg shadow-emerald-950/10">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-25"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-transparent"
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
            {t('home.categoriesEyebrow')}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
            {categoryName(category, language)}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/70 sm:text-base">
            {t('home.categoriesSubtitle')}
          </p>

          {children.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {children.map((child) => (
                <Link
                  key={child.id}
                  to={`/c/${child.slug}`}
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/20"
                >
                  {categoryName(child, language)}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {t('publicStore.productsTitle')}
          </h2>
        </div>
        <div className="mt-4">
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActiveCategories, type Category } from '../api/categories'
import { listFeaturedProducts, type PublicProduct } from '../api/catalog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { SearchBar } from '../components/SearchBar'
import { Skeleton } from '../components/Skeleton'
import { buildCategoryTree, categoryName } from '../lib/categories'
import { useI18n } from '../lib/i18n'

function CategoryGridSkeleton() {
  const { t } = useI18n()

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <Skeleton className="aspect-[4/3]" />
            <div className="p-3">
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomePage() {
  const { t, language } = useI18n()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [products, setProducts] = useState<PublicProduct[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    void Promise.all([listActiveCategories(), listFeaturedProducts(8)])
      .then(([nextCategories, nextProducts]) => {
        if (!active) return
        setCategories(nextCategories)
        setProducts(nextProducts)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
    }
  }, [version])

  const categoryTree = categories ? buildCategoryTree(categories) : []

  return (
    <div>
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {t('home.eyebrow')}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t('home.title')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {t('home.subtitle')}
        </p>
        <SearchBar className="mx-auto mt-6 max-w-xl" />
      </section>

      {failed ? (
        <div className="mt-10">
          <ErrorState
            onRetry={() => {
              setFailed(false)
              setCategories(null)
              setProducts(null)
              setVersion((current) => current + 1)
            }}
          />
        </div>
      ) : (
        <>
          <section className="mt-10 sm:mt-14">
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {t('home.categoriesTitle')}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t('home.categoriesSubtitle')}
              </p>
            </div>

            <div className="mt-4">
              {categories === null ? (
                <CategoryGridSkeleton />
              ) : categoryTree.length === 0 ? (
                <EmptyState>{t('home.categoriesEmpty')}</EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {categoryTree.map((category) => (
                    <Link
                      key={category.id}
                      to={`/c/${category.slug}`}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-emerald-50">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="grid size-full place-items-center text-2xl font-bold text-emerald-700"
                          >
                            {categoryName(category, language)
                              .trim()
                              .slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <p className="truncate p-3 text-sm font-semibold text-slate-900">
                        {categoryName(category, language)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-10 sm:mt-14">
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {t('home.featuredTitle')}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t('home.featuredSubtitle')}
              </p>
            </div>

            <div className="mt-4">
              {products === null ? (
                <ProductGridSkeleton />
              ) : products.length === 0 ? (
                <EmptyState>{t('home.featuredEmpty')}</EmptyState>
              ) : (
                <ProductGrid products={products} showStore />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

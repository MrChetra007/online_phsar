import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActiveCategories, type Category } from '../api/categories'
import { listFeaturedProducts, type PublicProduct } from '../api/catalog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { SearchBar } from '../components/SearchBar'
import { Skeleton } from '../components/Skeleton'
import {
  ArrowRightIcon,
  CheckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StoreIcon,
  TruckIcon,
} from '../components/icons'
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
            className="overflow-hidden rounded-3xl border border-stone-200 bg-white"
          >
            <Skeleton className="aspect-[4/3]" />
            <div className="p-4">
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
  const heroImages =
    products?.flatMap((product) => product.images.slice(0, 1)).slice(0, 3) ?? []

  const trustItems = [
    {
      title: t('home.trustLocalTitle'),
      text: t('home.trustLocalText'),
      icon: StoreIcon,
    },
    {
      title: t('home.trustPaymentTitle'),
      text: t('home.trustPaymentText'),
      icon: ShieldCheckIcon,
    },
    {
      title: t('home.trustTrackingTitle'),
      text: t('home.trustTrackingText'),
      icon: TruckIcon,
    },
  ]

  return (
    <div>
      <section className="relative overflow-hidden rounded-[2rem] bg-ink text-white shadow-2xl shadow-emerald-950/10">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-96 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 left-1/3 size-96 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-100 ring-1 ring-white/15">
              <SparklesIcon className="size-4 text-emerald-300" />
              {t('home.eyebrow')}
            </span>

            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t('home.title')}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-emerald-50/75 sm:text-lg">
              {t('home.subtitle')}
            </p>

            <SearchBar className="mt-7 max-w-xl" />

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-emerald-50/80">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <CheckIcon className="size-3.5 text-emerald-300" />
                {t('checkout.cod')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <CheckIcon className="size-3.5 text-emerald-300" />
                KHQR
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <TruckIcon className="size-3.5 text-emerald-300" />
                {t('nav.track')}
              </span>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-md lg:mx-0 lg:ml-auto lg:block">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 aspect-[16/9] overflow-hidden rounded-3xl bg-emerald-900/60 ring-1 ring-white/10">
                {heroImages[0] ? (
                  <img
                    src={heroImages[0].url}
                    alt=""
                    fetchPriority="high"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-emerald-700/60 to-emerald-950">
                    <StoreIcon className="size-12 text-emerald-200/70" />
                  </div>
                )}
              </div>
              {[1, 2].map((index) => {
                const image = heroImages[index]
                return (
                  <div
                    key={index}
                    className="aspect-square overflow-hidden rounded-3xl bg-emerald-900/60 ring-1 ring-white/10"
                  >
                    {image ? (
                      <img
                        src={image.url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-gradient-to-br from-emerald-800/70 to-ink">
                        {index === 1 ? (
                          <ShieldCheckIcon className="size-8 text-emerald-200/60" />
                        ) : (
                          <TruckIcon className="size-8 text-emerald-200/60" />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        {trustItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                {item.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {item.text}
              </p>
            </div>
          )
        })}
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
          <section className="mt-12 sm:mt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  {t('home.categoriesEyebrow')}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {t('home.categoriesTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {t('home.categoriesSubtitle')}
                </p>
              </div>
            </div>

            <div className="mt-5">
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
                      className="group relative overflow-hidden rounded-3xl bg-ink shadow-sm"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="grid size-full place-items-center bg-gradient-to-br from-emerald-700 to-ink">
                            <span
                              aria-hidden="true"
                              className="text-4xl font-bold text-emerald-100/70"
                            >
                              {categoryName(category, language)
                                .trim()
                                .slice(0, 1)}
                            </span>
                          </div>
                        )}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                          <span className="min-w-0 truncate text-sm font-semibold text-white drop-shadow">
                            {categoryName(category, language)}
                          </span>
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:bg-emerald-400 group-hover:text-emerald-950">
                            <ArrowRightIcon className="size-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-12 sm:mt-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                {t('home.featuredEyebrow')}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {t('home.featuredTitle')}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t('home.featuredSubtitle')}
              </p>
            </div>

            <div className="mt-5">
              {products === null ? (
                <ProductGridSkeleton />
              ) : products.length === 0 ? (
                <EmptyState>{t('home.featuredEmpty')}</EmptyState>
              ) : (
                <ProductGrid products={products} showStore />
              )}
            </div>
          </section>

          <section className="mt-12 overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-8 text-white shadow-xl shadow-emerald-950/10 sm:mt-16 sm:px-10 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                {t('home.sellerEyebrow')}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                {t('home.sellerTitle')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/70 sm:text-base">
                {t('home.sellerText')}
              </p>
            </div>
            <Link
              to="/signup"
              className="mt-6 inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 lg:mt-0"
            >
              {t('home.sellerCta')}
              <ArrowRightIcon className="size-4" />
            </Link>
          </section>
        </>
      )}
    </div>
  )
}

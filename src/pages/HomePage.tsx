import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listActiveCategories, type Category } from '../api/categories'
import { listFeaturedProducts, type PublicProduct } from '../api/catalog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { SearchBar } from '../components/SearchBar'
import {
  ArrowRightIcon,
  CartIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  CreditCardIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StoreIcon,
  TruckIcon,
} from '../components/icons'
import {
  buildCategoryTree,
  categoryName,
  flattenCategoryTree,
} from '../lib/categories'
import { useI18n } from '../lib/i18n'

export function HomePage() {
  const { t, language } = useI18n()
  const navigate = useNavigate()
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

  const flatCategories = categories
    ? flattenCategoryTree(buildCategoryTree(categories))
    : []
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

  const steps = [
    {
      title: t('home.howStep1Title'),
      text: t('home.howStep1Text'),
      icon: SearchIcon,
    },
    {
      title: t('home.howStep2Title'),
      text: t('home.howStep2Text'),
      icon: CreditCardIcon,
    },
    {
      title: t('home.howStep3Title'),
      text: t('home.howStep3Text'),
      icon: TruckIcon,
    },
    {
      title: t('home.howStep4Title'),
      text: t('home.howStep4Text'),
      icon: ClipboardListIcon,
    },
  ]

  const shopperPoints = [
    t('home.shopperPoint1'),
    t('home.shopperPoint2'),
    t('home.shopperPoint3'),
  ]

  const ownerPoints = [
    t('home.ownerPoint1'),
    t('home.ownerPoint2'),
    t('home.ownerPoint3'),
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

      <section className="mt-12 sm:mt-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {t('home.howEyebrow')}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('home.howTitle')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            {t('home.howSubtitle')}
          </p>
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="relative rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-stone-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {step.text}
                </p>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-12 sm:mt-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {t('home.rolesEyebrow')}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('home.rolesTitle')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            {t('home.rolesSubtitle')}
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CartIcon className="size-5" />
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
              {t('home.shopperTitle')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {t('home.shopperText')}
            </p>
            <ul className="mt-5 space-y-2.5">
              {shopperPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-slate-700"
                >
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              to="/search"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              {t('home.shopperCta')}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="rounded-[2rem] bg-emerald-950 p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-emerald-200">
              <StoreIcon className="size-5" />
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight">
              {t('home.ownerTitle')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50/70">
              {t('home.ownerText')}
            </p>
            <ul className="mt-5 space-y-2.5">
              {ownerPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-emerald-50/85"
                >
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              to="/signup?role=store_owner"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50"
            >
              {t('home.ownerCta')}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
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

            <div className="mt-5 max-w-sm">
              {categories === null ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="h-12 animate-pulse rounded-xl bg-stone-200/70"
                >
                  <span className="sr-only">{t('common.loading')}</span>
                </div>
              ) : flatCategories.length === 0 ? (
                <EmptyState>{t('home.categoriesEmpty')}</EmptyState>
              ) : (
                <div className="relative">
                  <select
                    value=""
                    onChange={(event) => {
                      const slug = event.target.value
                      if (slug) navigate(`/c/${slug}`)
                    }}
                    aria-label={t('home.categoriesSelect')}
                    className="block w-full appearance-none rounded-xl border border-stone-300 bg-white py-3 pl-4 pr-11 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/70"
                  >
                    <option value="">{t('home.categoriesSelect')}</option>
                    {flatCategories.map(({ category, depth }) => (
                      <option key={category.id} value={category.slug}>
                        {'— '.repeat(depth)}
                        {categoryName(category, language)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
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
        </>
      )}
    </div>
  )
}

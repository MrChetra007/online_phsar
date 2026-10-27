import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPublicProducts, type PublicProduct } from '../api/catalog'
import { getActiveStoreBySlug, type PublicStore } from '../api/stores'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { Skeleton } from '../components/Skeleton'
import { ArrowRightIcon, StoreIcon, TruckIcon } from '../components/icons'
import { rememberStoreLinkSource } from '../lib/attribution'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { provinceLabel } from '../lib/provinces'

export function PublicStorePage() {
  const { t, language } = useI18n()
  const { slug } = useParams<{ slug: string }>()

  const [store, setStore] = useState<PublicStore | null>(null)
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [productsState, setProductsState] = useState<{
    storeId: string
    status: 'loading' | 'ready' | 'error'
    items: PublicProduct[]
  } | null>(null)
  const [productsVersion, setProductsVersion] = useState(0)

  useEffect(() => {
    if (!slug) return

    let active = true

    void getActiveStoreBySlug(slug)
      .then((next) => {
        if (active) setStore(next)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (!active) return
        setLoadedSlug(slug)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug, version])

  useEffect(() => {
    if (store) rememberStoreLinkSource()
  }, [store])

  useEffect(() => {
    if (!store) return

    let active = true

    void listPublicProducts({ storeId: store.id })
      .then((items) => {
        if (active) {
          setProductsState({ storeId: store.id, status: 'ready', items })
        }
      })
      .catch(() => {
        if (active) {
          setProductsState({ storeId: store.id, status: 'error', items: [] })
        }
      })

    return () => {
      active = false
    }
  }, [store, productsVersion])

  if (!slug) return null

  if (loading || loadedSlug !== slug) {
    return (
      <div>
        <Skeleton className="h-64 w-full rounded-[2rem]" />
        <div className="mt-8">
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <ErrorState
        onRetry={() => {
          setFailed(false)
          setLoading(true)
          setVersion((current) => current + 1)
        }}
      />
    )
  }

  if (!store) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <StoreIcon className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('publicStore.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('publicStore.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t('publicStore.backHome')}
          <ArrowRightIcon className="size-4" />
        </Link>
      </section>
    )
  }

  const productsForStore =
    productsState?.storeId === store.id ? productsState : null
  const products = productsForStore?.items ?? []
  const productsLoading =
    !productsForStore || productsForStore.status === 'loading'
  const productsFailed = productsForStore?.status === 'error'

  const delivery = [
    {
      label: t('publicStore.local'),
      cents: store.delivery_fee_local,
    },
    {
      label: t('publicStore.other'),
      cents: store.delivery_fee_other,
    },
  ]

  return (
    <section className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink text-white shadow-xl shadow-emerald-950/10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-24 size-80 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="flex flex-wrap items-start gap-4">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt=""
                className="size-20 shrink-0 rounded-3xl object-cover ring-1 ring-white/20"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-20 shrink-0 place-items-center rounded-3xl bg-white/10 text-2xl font-bold text-emerald-100 ring-1 ring-white/15"
              >
                {store.name.trim().slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                {t('publicStore.localStore')}
              </p>
              <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                {store.name}
              </h1>
              {store.province ? (
                <p className="mt-2 text-sm text-emerald-50/70">
                  {provinceLabel(store.province, language)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {delivery.map((entry) => (
              <div
                key={entry.label}
                className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"
              >
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-200/70">
                  <TruckIcon className="size-3.5" />
                  {entry.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {entry.cents === 0
                    ? t('publicStore.free')
                    : formatMoney(entry.cents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {store.description ? (
        <div className="mt-5 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            {t('publicStore.about')}
          </h2>
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 sm:text-base">
            {store.description}
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        {productsLoading ? (
          <ProductGridSkeleton count={6} />
        ) : productsFailed ? (
          <ErrorState
            message={t('publicStore.productsError')}
            onRetry={() => {
              setProductsState({
                storeId: store.id,
                status: 'loading',
                items: [],
              })
              setProductsVersion((current) => current + 1)
            }}
          />
        ) : products.length === 0 ? (
          <EmptyState>{t('publicStore.productsSoon')}</EmptyState>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {t('publicStore.productsTitle')}
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {products.length}
              </span>
            </div>
            <div className="mt-4">
              <ProductGrid products={products} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

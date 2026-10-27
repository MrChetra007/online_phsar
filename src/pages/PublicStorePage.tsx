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

      {(store.facebook_url || store.telegram_username) ? (
        <div className="mt-5 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            {t('publicStore.contactTitle')}
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {store.facebook_url ? (
              <a
                href={store.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {t('publicStore.facebookPage')}
              </a>
            ) : null}
            {store.telegram_username ? (
              <a
                href={`https://t.me/${store.telegram_username.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                {t('publicStore.telegram')}
              </a>
            ) : null}
          </div>
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

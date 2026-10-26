import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPublicProducts, type PublicProduct } from '../api/catalog'
import { getActiveStoreBySlug, type PublicStore } from '../api/stores'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { Skeleton } from '../components/Skeleton'
import { rememberStoreLinkSource } from '../lib/attribution'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'

export function PublicStorePage() {
  const { t } = useI18n()
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="mt-3 h-9 w-2/3 rounded" />
          <Skeleton className="mt-3 h-4 w-1/3 rounded" />
          <Skeleton className="mt-6 h-20 w-full rounded-xl" />
        </div>
        <div className="mt-5">
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
        <h1 className="text-3xl font-bold text-slate-900">
          {t('publicStore.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('publicStore.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          {t('publicStore.backHome')}
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt=""
              className="size-16 shrink-0 rounded-2xl object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-700">
              {t('publicStore.localStore')}
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
              {store.name}
            </h1>
            {store.province ? (
              <p className="mt-2 text-slate-600">{store.province}</p>
            ) : null}
          </div>
        </div>

        {store.description ? (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('publicStore.about')}
            </h2>
            <p className="mt-2 whitespace-pre-line break-words text-slate-700">
              {store.description}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">
            {t('publicStore.delivery')}
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {delivery.map((entry) => (
              <div
                key={entry.label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {entry.label}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {entry.cents === 0
                    ? t('publicStore.free')
                    : formatMoney(entry.cents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
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
            <h2 className="text-xl font-bold text-slate-900">
              {t('publicStore.productsTitle')}
            </h2>
            <div className="mt-3">
              <ProductGrid products={products} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listActiveProductsForStore, type PublicProduct } from '../api/products'
import { getActiveStoreBySlug, type PublicStore } from '../api/stores'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { categoryName } from '../lib/categories'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { priceRange } from '../lib/products'

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
    if (!store) return

    let active = true

    void listActiveProductsForStore(store.id)
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
  if (loading || loadedSlug !== slug) return <LoadingState />
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
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
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
    <section className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">
          {t('publicStore.localStore')}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{store.name}</h1>
        {store.province ? (
          <p className="mt-2 text-slate-600">{store.province}</p>
        ) : null}

        {store.description ? (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('publicStore.about')}
            </h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {t('common.loading')}
          </div>
        ) : productsFailed ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p>{t('publicStore.productsError')}</p>
            <button
              type="button"
              className="mt-2 font-semibold underline"
              onClick={() => {
                setProductsState({
                  storeId: store.id,
                  status: 'loading',
                  items: [],
                })
                setProductsVersion((current) => current + 1)
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            {t('publicStore.productsSoon')}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-slate-900">
              {t('publicStore.productsTitle')}
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const range = priceRange(
                  product.variants.map((variant) => variant.price),
                )
                const stock = product.variants.reduce(
                  (total, variant) => total + variant.stock,
                  0,
                )
                const image = product.images[0]

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="aspect-square bg-slate-100">
                      {image ? (
                        <img
                          src={image.url}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-3xl font-semibold text-slate-400">
                          {product.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {product.category ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {categoryName(product.category, language)}
                        </p>
                      ) : null}
                      <h3 className="mt-1 font-semibold text-slate-900">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {range ? (
                          <p className="font-semibold text-slate-900">
                            {range.min === range.max
                              ? formatMoney(range.min)
                              : `${formatMoney(range.min)} – ${formatMoney(range.max)}`}
                          </p>
                        ) : null}
                        <p
                          className={`text-xs font-medium ${
                            stock > 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {stock > 0
                            ? t('product.inStock')
                            : t('product.outOfStock')}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

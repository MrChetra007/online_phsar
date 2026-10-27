import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listMyProducts,
  type ProductWithDetails,
  type ProductVariant,
} from '../../api/products'
import type { Store } from '../../api/stores'
import { ProductStatusBadge } from '../../components/ProductStatusBadge'
import { useI18n } from '../../lib/i18n'
import { categoryName } from '../../lib/categories'
import { formatMoney } from '../../lib/money'
import { priceRange } from '../../lib/products'

function activeVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants.filter((variant) => variant.is_active)
}

function ProductPrice({ variants }: { variants: ProductVariant[] }) {
  const { t } = useI18n()
  const active = activeVariants(variants)
  const range = priceRange(active.map((variant) => variant.price))

  if (!range)
    return (
      <p className="text-sm text-slate-500">
        {t('store.productNoActiveVariants')}
      </p>
    )
  if (range.min === range.max) {
    return (
      <p className="font-semibold text-slate-900">{formatMoney(range.min)}</p>
    )
  }

  return (
    <p className="font-semibold text-slate-900">
      {formatMoney(range.min)} – {formatMoney(range.max)}
    </p>
  )
}

export function StoreProductsSection({
  store,
  showHeading = true,
}: {
  store: Store
  showHeading?: boolean
}) {
  const { t, language } = useI18n()
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    void listMyProducts(store.id)
      .then((next) => {
        if (active) setProducts(next)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [store.id, version])

  const locked = store.status === 'suspended'

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
      {showHeading ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t('store.productsTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('store.productsSubtitle')}
            </p>
          </div>
          {locked ? null : (
            <Link
              to="/store/products/new"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {t('store.addProduct')}
            </Link>
          )}
        </div>
      ) : null}

      {locked ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          {t('store.productLocked')}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">{t('common.loading')}</p>
      ) : failed ? (
        <div className="mt-5 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
          {t('store.productError')}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setFailed(false)
              setLoading(true)
              setVersion((current) => current + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-sm text-slate-600">
          {t('store.productListEmpty')}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {products.map((product) => {
            const active = activeVariants(product.variants)
            const stock = active.reduce(
              (sum, variant) => sum + variant.stock,
              0,
            )
            const image = product.images[0]

            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200/80 p-3.5 transition-colors hover:border-emerald-200"
              >
                {image ? (
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    className="size-16 rounded-xl border border-stone-200 object-cover"
                  />
                ) : (
                  <div className="grid size-16 place-items-center rounded-xl bg-stone-100 text-lg font-semibold text-stone-400">
                    {product.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {product.name}
                    </p>
                    <ProductStatusBadge status={product.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {product.category
                      ? categoryName(product.category, language)
                      : t('store.uncategorized')}
                    {' · '}
                    {t('store.variantStock')}: {stock}
                  </p>
                  <div className="mt-1">
                    <ProductPrice variants={product.variants} />
                  </div>
                </div>

                {locked ? null : (
                  <Link
                    to={`/store/products/${product.id}`}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    {t('common.edit')}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

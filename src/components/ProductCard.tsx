import { Link } from 'react-router-dom'
import type { PublicProduct } from '../api/catalog'
import { categoryName } from '../lib/categories'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { priceRange } from '../lib/products'

export function ProductCard({
  product,
  showStore = false,
}: {
  product: PublicProduct
  showStore?: boolean
}) {
  const { t, language } = useI18n()
  const image = product.images[0]
  const range = priceRange(product.variants.map((variant) => variant.price))
  const stock = product.variants.reduce(
    (total, variant) => total + variant.stock,
    0,
  )

  return (
    <Link
      to={`/p/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image.url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid size-full place-items-center bg-emerald-50 text-2xl font-bold text-emerald-700"
          >
            {product.name.trim().slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.category ? (
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            {categoryName(product.category, language)}
          </p>
        ) : null}

        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">
          {product.name}
        </h3>

        {showStore && product.store ? (
          <p className="mt-1 truncate text-xs text-slate-500">
            {product.store.name}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
          {range ? (
            <p className="text-sm font-semibold text-slate-900">
              {range.min === range.max
                ? formatMoney(range.min)
                : `${formatMoney(range.min)} – ${formatMoney(range.max)}`}
            </p>
          ) : null}
          <p
            className={`text-[11px] font-medium ${
              stock > 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {stock > 0 ? t('product.inStock') : t('product.outOfStock')}
          </p>
        </div>
      </div>
    </Link>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicProduct } from '../api/catalog'
import { useFavorites } from '../features/favorites'
import { useToast } from '../features/toast'
import { categoryName } from '../lib/categories'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { priceRange } from '../lib/products'
import { ArrowRightIcon, HeartIcon } from './icons'

export function ProductCard({
  product,
  showStore = false,
  showFavorite = true,
}: {
  product: PublicProduct
  showStore?: boolean
  showFavorite?: boolean
}) {
  const { t, language } = useI18n()
  const { ready, canFavorite, isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const favorite = isFavorite(product.id)
  const image = product.images[0]
  const range = priceRange(product.variants.map((variant) => variant.price))
  const stock = product.variants.reduce(
    (total, variant) => total + variant.stock,
    0,
  )

  async function handleToggleFavorite() {
    if (!ready || favoriteBusy) return
    setFavoriteBusy(true)

    try {
      const next = await toggleFavorite(product.id)
      showToast(t(next ? 'account.favoriteAdded' : 'account.favoriteRemoved'), {
        tone: 'success',
      })
    } catch {
      showToast(t('common.errorText'), { tone: 'error' })
    } finally {
      setFavoriteBusy(false)
    }
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5">
      <Link to={`/p/${product.id}`} className="flex h-full flex-col">
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
          {image ? (
            <img
              src={image.url}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              aria-hidden="true"
              className="grid size-full place-items-center bg-gradient-to-br from-emerald-50 to-stone-100 text-4xl font-bold text-emerald-700"
            >
              {product.name.trim().slice(0, 1).toUpperCase()}
            </div>
          )}

          <span
            className={[
              'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur',
              stock > 0
                ? 'bg-white/90 text-emerald-700'
                : 'bg-white/90 text-red-600',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={[
                'size-1.5 rounded-full',
                stock > 0 ? 'bg-emerald-500' : 'bg-red-500',
              ].join(' ')}
            />
            {stock > 0 ? t('product.inStock') : t('product.outOfStock')}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {product.category ? (
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              {categoryName(product.category, language)}
            </p>
          ) : null}

          <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
            {product.name}
          </h3>

          {showStore && product.store ? (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center rounded-full bg-stone-100 text-[9px] font-bold text-stone-500"
              >
                {product.store.name.trim().slice(0, 1).toUpperCase()}
              </span>
              <p className="truncate text-xs text-slate-500">
                {product.store.name}
              </p>
            </div>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            {range ? (
              <p className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                {range.min === range.max
                  ? formatMoney(range.min)
                  : `${formatMoney(range.min)} – ${formatMoney(range.max)}`}
              </p>
            ) : (
              <span />
            )}
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-100 text-slate-500 transition group-hover:bg-emerald-700 group-hover:text-white">
              <ArrowRightIcon className="size-4" />
            </span>
          </div>
        </div>
      </Link>

      {showFavorite && canFavorite ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void handleToggleFavorite()
          }}
          disabled={!ready || favoriteBusy}
          aria-pressed={favorite}
          aria-label={t(
            favorite ? 'account.removeFavorite' : 'account.favorite',
          )}
          className={[
            'absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:scale-105 hover:bg-white disabled:opacity-60',
            favorite ? 'text-rose-600' : 'text-slate-700',
          ].join(' ')}
        >
          <HeartIcon
            className="size-4"
            fill={favorite ? 'currentColor' : 'none'}
          />
        </button>
      ) : null}
    </div>
  )
}

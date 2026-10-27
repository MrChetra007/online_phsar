import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicProduct, type PublicProduct } from '../api/catalog'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState } from '../components/ErrorState'
import { QuantityStepper } from '../components/QuantityStepper'
import { Skeleton } from '../components/Skeleton'
import {
  ArrowRightIcon,
  CheckIcon,
  StoreIcon,
  TruckIcon,
} from '../components/icons'
import { useCart } from '../features/cart'
import { categoryName } from '../lib/categories'
import type { CartItemInput, CartStore } from '../lib/cart'
import { getErrorMessage } from '../lib/errors'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { priceRange } from '../lib/products'

type ProductState = {
  requestKey: string
  status: 'ready' | 'error'
  product: PublicProduct | null
}

type PendingAdd = {
  store: CartStore
  item: CartItemInput
  quantity: number
}

export function ProductPage() {
  const { t, language } = useI18n()
  const { cart, addItem, replaceWithItem } = useCart()
  const { productId } = useParams<{ productId: string }>()
  const [version, setVersion] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  )
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addStatus, setAddStatus] = useState<'added' | 'sold_out' | null>(null)
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null)
  const [state, setState] = useState<ProductState>({
    requestKey: '',
    status: 'ready',
    product: null,
  })

  useEffect(() => {
    if (!productId) return

    let active = true
    const requestKey = `${productId}:${version}`

    void getPublicProduct(productId)
      .then((product) => {
        if (active) {
          setState({ requestKey, status: 'ready', product })
          setSelectedVariantId(null)
          setSelectedImageId(null)
          setQuantity(1)
          setAddStatus(null)
          setPendingAdd(null)
        }
      })
      .catch(() => {
        if (active) {
          setState({ requestKey, status: 'error', product: null })
        }
      })

    return () => {
      active = false
    }
  }, [productId, version])

  if (!productId) return null

  const requestKey = `${productId}:${version}`

  if (state.requestKey !== requestKey) {
    return (
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <Skeleton className="aspect-square rounded-[2rem]" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-11 w-3/4 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-3xl" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        onRetry={() => setVersion((current) => current + 1)}
        message={t('product.error')}
      />
    )
  }

  if (!state.product) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <StoreIcon className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('product.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('product.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t('common.backHome')}
          <ArrowRightIcon className="size-4" />
        </Link>
      </section>
    )
  }

  const product = state.product
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.stock > 0) ??
    product.variants[0] ??
    null
  const selectedImage =
    product.images.find((image) => image.id === selectedImageId) ??
    product.images[0] ??
    null
  const range = priceRange(product.variants.map((variant) => variant.price))
  const inStock = (selectedVariant?.stock ?? 0) > 0
  const maxQuantity = Math.max(1, Math.min(99, selectedVariant?.stock ?? 1))
  const safeQuantity = Math.min(Math.max(1, quantity), maxQuantity)
  const canAdd = Boolean(
    selectedVariant && selectedVariant.stock > 0 && product.store,
  )

  function buildPendingAdd(): PendingAdd | null {
    if (!selectedVariant || !product.store || selectedVariant.stock <= 0) {
      return null
    }

    return {
      store: {
        id: product.store_id,
        slug: product.store.slug,
        name: product.store.name,
      },
      item: {
        variantId: selectedVariant.id,
        productId: product.id,
        productName: product.name,
        variantLabel: selectedVariant.label,
        unitPrice: selectedVariant.price,
        imageUrl: product.images[0]?.url ?? null,
        stock: selectedVariant.stock,
      },
      quantity: safeQuantity,
    }
  }

  function handleAddToCart() {
    const pending = buildPendingAdd()
    if (!pending) {
      setAddStatus('sold_out')
      return
    }

    const outcome = addItem(pending.store, pending.item, pending.quantity)

    if (outcome === 'different_store') {
      setPendingAdd(pending)
      return
    }

    setAddStatus(outcome)
  }

  function handleReplaceCart() {
    if (!pendingAdd) return

    const outcome = replaceWithItem(
      pendingAdd.store,
      pendingAdd.item,
      pendingAdd.quantity,
    )
    setPendingAdd(null)
    setAddStatus(outcome === 'added' ? 'added' : 'sold_out')
  }

  return (
    <section>
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500"
      >
        <Link to="/" className="hover:text-emerald-700">
          {t('nav.home')}
        </Link>
        {product.category ? (
          <>
            <span aria-hidden="true">/</span>
            <Link
              to={`/c/${product.category.slug}`}
              className="hover:text-emerald-700"
            >
              {categoryName(product.category, language)}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="truncate text-slate-700">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-12">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-stone-200/80 bg-stone-100 shadow-sm">
            {selectedImage ? (
              <img
                src={selectedImage.url}
                alt={product.name}
                fetchPriority="high"
                className="size-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="grid size-full place-items-center bg-gradient-to-br from-emerald-50 to-stone-100 text-5xl font-bold text-emerald-700"
              >
                {product.name.trim().slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          {product.images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  aria-label={`${t('product.photo')} ${index + 1}`}
                  aria-pressed={selectedImage?.id === image.id}
                  className={[
                    'size-16 shrink-0 overflow-hidden rounded-2xl border-2 transition',
                    selectedImage?.id === image.id
                      ? 'border-emerald-600'
                      : 'border-transparent opacity-70 hover:opacity-100',
                  ].join(' ')}
                >
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.category ? (
              <Link
                to={`/c/${product.category.slug}`}
                className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-stone-200/80 transition hover:ring-emerald-300"
              >
                {categoryName(product.category, language)}
              </Link>
            ) : null}
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                inStock
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'size-1.5 rounded-full',
                  inStock ? 'bg-emerald-500' : 'bg-red-500',
                ].join(' ')}
              />
              {inStock ? t('product.inStock') : t('product.outOfStock')}
            </span>
          </div>

          <h1 className="mt-3 break-words text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
            {product.name}
          </h1>

          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {selectedVariant
              ? formatMoney(selectedVariant.price)
              : range
                ? `${formatMoney(range.min)} â€“ ${formatMoney(range.max)}`
                : null}
          </p>

          {product.variants.length > 0 ? (
            <div className="mt-7">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('product.chooseVariant')}
              </h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id
                  const unavailable = variant.stock <= 0

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={unavailable}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedVariantId(variant.id)
                        setQuantity(1)
                        setAddStatus(null)
                      }}
                      className={[
                        'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-2xl border-2 px-4 py-3 text-left text-sm transition',
                        unavailable
                          ? 'cursor-not-allowed border-stone-200 bg-stone-50 text-slate-500'
                          : isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950'
                            : 'border-stone-200 bg-white text-slate-800 hover:border-emerald-300',
                      ].join(' ')}
                    >
                      <span className="font-semibold">
                        {variant.label === 'Default'
                          ? t('store.defaultVariant')
                          : variant.label}
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">
                          {formatMoney(variant.price)}
                        </span>
                        {unavailable ? (
                          <span>{t('product.outOfStock')}</span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t('cart.quantity')}
                </p>
                <QuantityStepper
                  value={safeQuantity}
                  max={maxQuantity}
                  onChange={(next) => {
                    setQuantity(next)
                    setAddStatus(null)
                  }}
                  className="mt-2"
                />
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={!canAdd}
                className="h-12 w-full sm:flex-1"
              >
                {t('cart.addToCart')}
              </Button>
            </div>

            {addStatus === 'added' ? (
              <p role="status" className="mt-3 text-sm text-emerald-700">
                {t('cart.added')}{' '}
                <Link to="/cart" className="font-semibold underline">
                  {t('nav.cart')}
                </Link>
              </p>
            ) : null}

            {addStatus === 'sold_out' ? (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {getErrorMessage('SOLD_OUT', language)}
              </p>
            ) : null}

            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <CheckIcon className="size-3.5 text-emerald-600" />
              {t('checkout.secureNote')}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs font-medium text-slate-600 ring-1 ring-stone-200/80">
              <CheckIcon className="size-3.5 shrink-0 text-emerald-600" />
              {t('checkout.cod')}
            </span>
            <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs font-medium text-slate-600 ring-1 ring-stone-200/80">
              <CheckIcon className="size-3.5 shrink-0 text-emerald-600" />
              KHQR
            </span>
            <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs font-medium text-slate-600 ring-1 ring-stone-200/80">
              <TruckIcon className="size-3.5 shrink-0 text-emerald-600" />
              {t('nav.track')}
            </span>
          </div>

          <div className="mt-6 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {t('product.descriptionTitle')}
            </h2>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 sm:text-base">
              {product.description || t('product.noDescription')}
            </p>
          </div>

          {product.store ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700"
              >
                {product.store.name.trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t('product.soldBy')}
                </p>
                <p className="truncate font-semibold text-slate-900">
                  {product.store.name}
                </p>
              </div>
              <Link
                to={`/s/${product.store.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                {t('product.visitStore')}
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {pendingAdd ? (
        <ConfirmDialog
          title={t('cart.differentStoreTitle')}
          confirmLabel={t('cart.clearAndAdd')}
          cancelLabel={t('cart.keepCart')}
          onConfirm={handleReplaceCart}
          onCancel={() => setPendingAdd(null)}
          danger
        >
          <p>{t('cart.differentStoreText')}</p>
          {cart ? (
            <p className="mt-2 font-medium text-slate-800">
              {cart.name} Â· {pendingAdd.store.name}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

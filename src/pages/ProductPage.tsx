import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicProduct, type PublicProduct } from '../api/catalog'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState } from '../components/ErrorState'
import { QuantityStepper } from '../components/QuantityStepper'
import { Skeleton } from '../components/Skeleton'
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
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-9 w-3/4 rounded" />
          <Skeleton className="h-7 w-32 rounded" />
          <Skeleton className="h-20 w-full rounded-xl" />
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
        <h1 className="text-3xl font-bold text-slate-900">
          {t('product.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('product.notFoundText')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {t('common.backHome')}
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

      <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-8">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {selectedImage ? (
              <img
                src={selectedImage.url}
                alt={product.name}
                className="size-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="grid size-full place-items-center bg-emerald-50 text-5xl font-bold text-emerald-700"
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
                    'size-16 shrink-0 overflow-hidden rounded-xl border-2 transition',
                    selectedImage?.id === image.id
                      ? 'border-emerald-600'
                      : 'border-transparent hover:border-slate-300',
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
          {product.category ? (
            <Link
              to={`/c/${product.category.slug}`}
              className="text-xs font-semibold uppercase tracking-wide text-emerald-700"
            >
              {categoryName(product.category, language)}
            </Link>
          ) : null}

          <h1 className="mt-1 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-bold text-slate-900">
              {selectedVariant
                ? formatMoney(selectedVariant.price)
                : range
                  ? `${formatMoney(range.min)} – ${formatMoney(range.max)}`
                  : null}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                inStock
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {inStock ? t('product.inStock') : t('product.outOfStock')}
            </span>
          </div>

          {product.variants.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">
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
                        'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                        unavailable
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                          : isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-400',
                      ].join(' ')}
                    >
                      <span className="font-medium">
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

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-900">
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
                className="w-full sm:flex-1"
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
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('product.descriptionTitle')}
            </h2>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 sm:text-base">
              {product.description || t('product.noDescription')}
            </p>
          </div>

          {product.store ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('product.soldBy')}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  {product.store.name}
                </p>
                <Link
                  to={`/s/${product.store.slug}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
                >
                  {t('product.visitStore')}
                </Link>
              </div>
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
              {cart.name} · {pendingAdd.store.name}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { QuantityStepper } from '../components/QuantityStepper'
import { ArrowRightIcon, CartIcon, StoreIcon } from '../components/icons'
import { useCart } from '../features/cart'
import { MAX_CART_QUANTITY } from '../lib/cart'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'

export function CartPage() {
  const { t } = useI18n()
  const { cart, itemCount, subtotal, setQuantity, removeItem, clearCart } =
    useCart()
  const [confirmClear, setConfirmClear] = useState(false)

  if (!cart) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <CartIcon className="size-8" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
          {t('cart.title')}
        </h1>
        <p className="mt-3 text-slate-600">{t('cart.empty')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t('cart.browse')}
          <ArrowRightIcon className="size-4" />
        </Link>
      </section>
    )
  }

  const hasUnavailable = cart.items.some(
    (item) => item.stock <= 0 || item.quantity > item.stock,
  )

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {t('nav.cart')}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t('cart.title')}
          </h1>
          <Link
            to={`/s/${cart.slug}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-stone-200/80 transition hover:text-emerald-700 hover:ring-emerald-300"
          >
            <StoreIcon className="size-3.5 text-emerald-600" />
            {cart.name}
          </Link>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
          {t('cart.clear')}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="space-y-3">
          {cart.items.map((item) => {
            const max = Math.min(MAX_CART_QUANTITY, Math.max(1, item.stock))

            return (
              <li
                key={item.variantId}
                className="flex gap-3 rounded-3xl border border-stone-200/80 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
              >
                <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100 sm:size-28">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="grid size-full place-items-center bg-gradient-to-br from-emerald-50 to-stone-100 text-2xl font-bold text-emerald-700"
                    >
                      {item.productName.trim().slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/p/${item.productId}`}
                        className="break-words font-semibold text-slate-900 transition hover:text-emerald-700"
                      >
                        {item.productName}
                      </Link>
                      {item.variantLabel !== 'Default' ? (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {item.variantLabel}
                        </p>
                      ) : null}
                      {item.stock <= 0 || item.quantity > item.stock ? (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {item.stock <= 0
                            ? t('product.outOfStock')
                            : t('cart.notEnoughStock')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      {t('cart.remove')}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <QuantityStepper
                      value={item.quantity}
                      max={max}
                      onChange={(next) => setQuantity(item.variantId, next)}
                    />
                    <p className="font-bold tracking-tight text-slate-950">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="h-fit rounded-3xl bg-ink p-5 text-white shadow-xl shadow-emerald-950/10 sm:p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">{t('cart.summary')}</h2>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-emerald-50/60">
            <span>{t('cart.items')}</span>
            <span>{itemCount}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="font-semibold">{t('cart.subtotal')}</span>
            <span className="text-2xl font-bold tracking-tight">
              {formatMoney(subtotal)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-emerald-50/60">
            {t('cart.deliveryAtCheckout')}
          </p>

          {hasUnavailable ? (
            <p className="mt-4 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-200 ring-1 ring-amber-300/20">
              {t('cart.unavailableNotice')}
            </p>
          ) : null}

          {hasUnavailable ? (
            <span className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white/40">
              {t('cart.checkout')}
            </span>
          ) : (
            <Link
              to="/checkout"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-emerald-50"
            >
              {t('cart.checkout')}
              <ArrowRightIcon className="size-4" />
            </Link>
          )}

          <Link
            to="/"
            className="mt-2 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-emerald-200 transition-colors hover:bg-white/5"
          >
            {t('cart.continueShopping')}
          </Link>
        </aside>
      </div>

      {confirmClear ? (
        <ConfirmDialog
          title={t('cart.clearTitle')}
          confirmLabel={t('cart.clearConfirm')}
          cancelLabel={t('cart.keep')}
          onConfirm={() => {
            clearCart()
            setConfirmClear(false)
          }}
          onCancel={() => setConfirmClear(false)}
          danger
        >
          <p>{t('cart.clearText')}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

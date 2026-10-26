import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { QuantityStepper } from '../components/QuantityStepper'
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
        <h1 className="text-3xl font-bold text-slate-900">{t('cart.title')}</h1>
        <p className="mt-3 text-slate-600">{t('cart.empty')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          {t('cart.browse')}
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
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('cart.title')}
          </h1>
          <Link
            to={`/s/${cart.slug}`}
            className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:underline"
          >
            {cart.name}
          </Link>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
          {t('cart.clear')}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="space-y-3">
          {cart.items.map((item) => {
            const max = Math.min(MAX_CART_QUANTITY, Math.max(1, item.stock))

            return (
              <li
                key={item.variantId}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
              >
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
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
                      className="grid size-full place-items-center bg-emerald-50 text-xl font-bold text-emerald-700"
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
                        className="break-words font-semibold text-slate-900 hover:text-emerald-700"
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
                      className="shrink-0 text-sm font-medium text-red-600 hover:underline"
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
                    <p className="font-semibold text-slate-900">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('cart.summary')}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>{t('cart.items')}</span>
            <span>{itemCount}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <span className="font-semibold text-slate-900">
              {t('cart.subtotal')}
            </span>
            <span className="text-lg font-bold text-slate-900">
              {formatMoney(subtotal)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {t('cart.deliveryAtCheckout')}
          </p>

          {hasUnavailable ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {t('cart.unavailableNotice')}
            </p>
          ) : null}

          {hasUnavailable ? (
            <span className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-500">
              {t('cart.checkout')}
            </span>
          ) : (
            <Link
              to="/checkout"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
            >
              {t('cart.checkout')}
            </Link>
          )}

          <Link
            to="/"
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
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

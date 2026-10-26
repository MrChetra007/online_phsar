import { describe, expect, it } from 'vitest'
import {
  addItemToCart,
  cartItemCount,
  cartSubtotal,
  changeItemQuantity,
  parseStoredCart,
  removeItemFromCart,
  type Cart,
  type CartItemInput,
  type CartStore,
} from './cart'

const store: CartStore = {
  id: 'store-1',
  slug: 'local-shop',
  name: 'Local Shop',
}

const otherStore: CartStore = {
  id: 'store-2',
  slug: 'other-shop',
  name: 'Other Shop',
}

const item: CartItemInput = {
  variantId: 'variant-1',
  productId: 'product-1',
  productName: 'Cotton Shirt',
  variantLabel: 'M',
  unitPrice: 1250,
  imageUrl: null,
  stock: 3,
}

describe('addItemToCart', () => {
  it('creates a cart for the first item', () => {
    const result = addItemToCart(null, store, item, 2)

    expect(result.status).toBe('added')
    expect(result.cart).toMatchObject({
      ...store,
      items: [{ ...item, quantity: 2 }],
    })
  })

  it('merges a repeated variant and caps at available stock', () => {
    const first = addItemToCart(null, store, item, 2).cart
    const result = addItemToCart(first, store, item, 2)

    expect(result.status).toBe('added')
    expect(result.cart?.items).toHaveLength(1)
    expect(result.cart?.items[0].quantity).toBe(3)
  })

  it('refuses to mix stores', () => {
    const first = addItemToCart(null, store, item, 1).cart
    const result = addItemToCart(first, otherStore, item, 1)

    expect(result.status).toBe('different_store')
    expect(result.cart).toBe(first)
  })

  it('refuses sold-out items', () => {
    const result = addItemToCart(null, store, { ...item, stock: 0 })

    expect(result.status).toBe('sold_out')
    expect(result.cart).toBeNull()
  })
})

describe('changeItemQuantity', () => {
  it('caps at stock and removes at zero', () => {
    const cart = addItemToCart(null, store, item, 1).cart

    const capped = changeItemQuantity(cart, item.variantId, 99)
    expect(capped?.items[0].quantity).toBe(3)

    expect(changeItemQuantity(capped, item.variantId, 0)).toBeNull()
  })
})

describe('removeItemFromCart', () => {
  it('returns null when the last item is removed', () => {
    const cart = addItemToCart(null, store, item, 1).cart

    expect(removeItemFromCart(cart, item.variantId)).toBeNull()
  })
})

describe('cart totals', () => {
  it('counts quantities and sums line totals', () => {
    const first = addItemToCart(null, store, item, 2).cart
    const cart: Cart = {
      ...first!,
      items: [
        ...first!.items,
        {
          ...item,
          variantId: 'variant-2',
          unitPrice: 500,
          quantity: 3,
        },
      ],
    }

    expect(cartItemCount(cart)).toBe(5)
    expect(cartSubtotal(cart)).toBe(4000)
    expect(cartItemCount(null)).toBe(0)
    expect(cartSubtotal(null)).toBe(0)
  })
})

describe('parseStoredCart', () => {
  it('reads a valid stored cart', () => {
    const cart = addItemToCart(null, store, item, 2).cart

    expect(parseStoredCart(JSON.stringify(cart))).toEqual(cart)
  })

  it('rejects malformed or incomplete data', () => {
    expect(parseStoredCart(null)).toBeNull()
    expect(parseStoredCart('not json')).toBeNull()
    expect(parseStoredCart('{}')).toBeNull()
    expect(
      parseStoredCart(
        JSON.stringify({ ...store, items: [{ ...item, quantity: 0 }] }),
      ),
    ).toBeNull()
    expect(parseStoredCart(JSON.stringify({ ...store, items: [] }))).toBeNull()
  })
})

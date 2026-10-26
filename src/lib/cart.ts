export const CART_STORAGE_KEY = 'kos.cart'
export const MAX_CART_QUANTITY = 99

export type CartStore = {
  id: string
  slug: string
  name: string
}

export type CartItemInput = {
  variantId: string
  productId: string
  productName: string
  variantLabel: string
  unitPrice: number
  imageUrl: string | null
  stock: number
}

export type CartItem = CartItemInput & {
  quantity: number
}

export type Cart = CartStore & {
  items: CartItem[]
}

export type AddToCartResult = {
  status: 'added' | 'different_store' | 'sold_out'
  cart: Cart | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isIntegerAtLeast(value: unknown, minimum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum
}

function maxQuantityFor(stock: number): number {
  return Math.min(MAX_CART_QUANTITY, Math.max(1, stock))
}

function limitQuantity(quantity: number, stock: number): number {
  return Math.min(Math.max(1, Math.trunc(quantity)), maxQuantityFor(stock))
}

function createItem(input: CartItemInput, quantity: number): CartItem {
  return {
    ...input,
    quantity: limitQuantity(quantity, input.stock),
  }
}

function withUpdatedItem(
  cart: Cart,
  variantId: string,
  update: (item: CartItem) => CartItem,
): Cart | null {
  const items = cart.items.map((item) =>
    item.variantId === variantId ? update(item) : item,
  )

  if (items.length === 0) return null
  return { ...cart, items }
}

export function addItemToCart(
  cart: Cart | null,
  store: CartStore,
  input: CartItemInput,
  quantity = 1,
): AddToCartResult {
  if (input.stock <= 0) return { status: 'sold_out', cart }

  if (cart && cart.id !== store.id) {
    return { status: 'different_store', cart }
  }

  if (!cart) {
    return {
      status: 'added',
      cart: { ...store, items: [createItem(input, quantity)] },
    }
  }

  const existing = cart.items.find((item) => item.variantId === input.variantId)

  const items = existing
    ? cart.items.map((item) =>
        item.variantId === input.variantId
          ? createItem(input, item.quantity + quantity)
          : item,
      )
    : [...cart.items, createItem(input, quantity)]

  return {
    status: 'added',
    cart: { ...store, items },
  }
}

export function changeItemQuantity(
  cart: Cart | null,
  variantId: string,
  quantity: number,
): Cart | null {
  if (!cart) return null

  if (quantity <= 0) {
    return removeItemFromCart(cart, variantId)
  }

  const item = cart.items.find((current) => current.variantId === variantId)
  if (!item) return cart

  return withUpdatedItem(cart, variantId, (current) => ({
    ...current,
    quantity: limitQuantity(quantity, current.stock),
  }))
}

export function removeItemFromCart(
  cart: Cart | null,
  variantId: string,
): Cart | null {
  if (!cart) return null

  const items = cart.items.filter((item) => item.variantId !== variantId)
  if (items.length === 0) return null
  return { ...cart, items }
}

export function cartItemCount(cart: Cart | null): number {
  return cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
}

export function cartSubtotal(cart: Cart | null): number {
  return (
    cart?.items.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    ) ?? 0
  )
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.variantId) &&
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.productName) &&
    typeof value.variantLabel === 'string' &&
    isIntegerAtLeast(value.unitPrice, 0) &&
    (value.imageUrl === null || typeof value.imageUrl === 'string') &&
    isIntegerAtLeast(value.stock, 0) &&
    isIntegerAtLeast(value.quantity, 1)
  )
}

export function parseStoredCart(raw: string | null): Cart | null {
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (
      !isNonEmptyString(parsed.id) ||
      !isNonEmptyString(parsed.slug) ||
      !isNonEmptyString(parsed.name) ||
      !Array.isArray(parsed.items) ||
      parsed.items.length === 0 ||
      !parsed.items.every(isCartItem)
    ) {
      return null
    }

    return {
      id: parsed.id,
      slug: parsed.slug,
      name: parsed.name,
      items: parsed.items,
    }
  } catch {
    return null
  }
}

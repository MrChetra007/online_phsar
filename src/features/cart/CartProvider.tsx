import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  addItemToCart,
  cartItemCount,
  cartSubtotal,
  CART_STORAGE_KEY,
  changeItemQuantity,
  parseStoredCart,
  removeItemFromCart,
  type Cart,
  type CartItemInput,
  type CartStore,
} from '../../lib/cart'
import { CartContext, type AddItemOutcome } from './context'

function readStoredCart(): Cart | null {
  try {
    return parseStoredCart(localStorage.getItem(CART_STORAGE_KEY))
  } catch {
    return null
  }
}

function writeStoredCart(cart: Cart | null): void {
  try {
    if (cart) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } else {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  } catch {
    return
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(readStoredCart)

  useEffect(() => {
    writeStoredCart(cart)
  }, [cart])

  const addItem = useCallback(
    (store: CartStore, item: CartItemInput, quantity = 1): AddItemOutcome => {
      const result = addItemToCart(cart, store, item, quantity)
      if (result.status === 'added') setCart(result.cart)
      return result.status
    },
    [cart],
  )

  const replaceWithItem = useCallback(
    (store: CartStore, item: CartItemInput, quantity = 1): AddItemOutcome => {
      const result = addItemToCart(null, store, item, quantity)
      if (result.status === 'added') setCart(result.cart)
      return result.status
    },
    [],
  )

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setCart((current) => changeItemQuantity(current, variantId, quantity))
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setCart((current) => removeItemFromCart(current, variantId))
  }, [])

  const clearCart = useCallback(() => setCart(null), [])

  const itemCount = cartItemCount(cart)
  const subtotal = cartSubtotal(cart)

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      subtotal,
      addItem,
      replaceWithItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      cart,
      itemCount,
      subtotal,
      addItem,
      replaceWithItem,
      setQuantity,
      removeItem,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

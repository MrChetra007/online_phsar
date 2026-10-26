import { createContext, useContext } from 'react'
import type {
  AddToCartResult,
  Cart,
  CartItemInput,
  CartStore,
} from '../../lib/cart'

export type AddItemOutcome = AddToCartResult['status']

export type CartContextValue = {
  cart: Cart | null
  itemCount: number
  subtotal: number
  addItem: (
    store: CartStore,
    item: CartItemInput,
    quantity?: number,
  ) => AddItemOutcome
  replaceWithItem: (
    store: CartStore,
    item: CartItemInput,
    quantity?: number,
  ) => AddItemOutcome
  setQuantity: (variantId: string, quantity: number) => void
  removeItem: (variantId: string) => void
  clearCart: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}

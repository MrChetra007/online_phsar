import { createContext, useContext } from 'react'

export type FavoritesContextValue = {
  favoriteIds: string[]
  ready: boolean
  canFavorite: boolean
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => Promise<boolean>
  setFavorite: (productId: string, favorite: boolean) => Promise<void>
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(
  null,
)

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext)
  if (!context)
    throw new Error('useFavorites must be used inside FavoritesProvider')
  return context
}

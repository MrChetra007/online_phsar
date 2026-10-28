import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addFavoriteProducts,
  listFavoriteProductIds,
  setProductFavorite,
} from '../../api/customer'
import { useAuth } from '../auth/context'
import { FavoritesContext } from './context'
import { readGuestFavorites, writeGuestFavorites } from './storage'

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session, profile, initializing, profileLoading } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const idsRef = useRef<string[]>([])

  const sessionUserId = session?.user.id
  const customerId = profile?.role === 'customer' ? profile.id : null
  const canFavorite =
    !initializing && (!sessionUserId || profile?.role === 'customer')

  const replaceIds = useCallback((ids: string[]) => {
    idsRef.current = ids
    setFavoriteIds(ids)
  }, [])

  useEffect(() => {
    if (initializing) return

    let active = true

    if (!sessionUserId) {
      queueMicrotask(() => {
        if (!active) return
        replaceIds(readGuestFavorites())
        setReady(true)
      })

      return () => {
        active = false
      }
    }

    if (profileLoading) {
      queueMicrotask(() => {
        if (active) setReady(false)
      })

      return () => {
        active = false
      }
    }

    if (!profile || profile.role !== 'customer') {
      queueMicrotask(() => {
        if (!active) return
        replaceIds([])
        setReady(true)
      })

      return () => {
        active = false
      }
    }

    const guestIds = readGuestFavorites()

    queueMicrotask(() => {
      if (active) setReady(false)
    })

    void (async () => {
      try {
        if (guestIds.length > 0) {
          await addFavoriteProducts(guestIds)
        }

        const ids = await listFavoriteProductIds()
        if (!active) return

        replaceIds(ids)

        const saved = new Set(ids)
        writeGuestFavorites(readGuestFavorites().filter((id) => !saved.has(id)))
        setReady(true)
      } catch {
        if (!active) return
        replaceIds(guestIds)
        setReady(true)
      }
    })()

    return () => {
      active = false
    }
  }, [initializing, sessionUserId, profileLoading, profile, replaceIds])

  const setFavorite = useCallback(
    async (productId: string, favorite: boolean) => {
      if (!canFavorite) throw new Error('Favorites are unavailable')

      const before = idsRef.current
      const nextIds = favorite
        ? [productId, ...before.filter((id) => id !== productId)]
        : before.filter((id) => id !== productId)

      replaceIds(nextIds)
      if (!customerId) writeGuestFavorites(nextIds)

      try {
        if (customerId) {
          await setProductFavorite(productId, favorite)
        }
      } catch (error) {
        const rolledBack = favorite
          ? idsRef.current.filter((id) => id !== productId)
          : [productId, ...idsRef.current.filter((id) => id !== productId)]

        replaceIds(rolledBack)
        if (!customerId) writeGuestFavorites(rolledBack)
        throw error
      }
    },
    [canFavorite, customerId, replaceIds],
  )

  const toggleFavorite = useCallback(
    async (productId: string) => {
      const next = !idsRef.current.includes(productId)
      await setFavorite(productId, next)
      return next
    },
    [setFavorite],
  )

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const value = useMemo(
    () => ({
      favoriteIds,
      ready,
      canFavorite,
      isFavorite: (productId: string) => favoriteSet.has(productId),
      toggleFavorite,
      setFavorite,
    }),
    [favoriteIds, ready, canFavorite, favoriteSet, toggleFavorite, setFavorite],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

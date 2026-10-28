import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicProductsByIds, type PublicProduct } from '../../api/catalog'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { ProductCard } from '../../components/ProductCard'
import { ProductGridSkeleton } from '../../components/ProductGrid'
import { HeartIcon } from '../../components/icons'
import { useFavorites } from './context'
import { useToast } from '../toast'
import { useI18n } from '../../lib/i18n'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; products: PublicProduct[] }
  | { status: 'error' }

export function FavoritesPage() {
  const { t } = useI18n()
  const { favoriteIds, ready, setFavorite } = useFavorites()
  const { showToast } = useToast()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return

    let active = true

    if (favoriteIds.length === 0) {
      queueMicrotask(() => {
        if (active) setState({ status: 'ready', products: [] })
      })

      return () => {
        active = false
      }
    }

    void listPublicProductsByIds(favoriteIds)
      .then((products) => {
        if (!active) return

        const byId = new Map(products.map((product) => [product.id, product]))
        setState({
          status: 'ready',
          products: favoriteIds
            .map((id) => byId.get(id))
            .filter((product): product is PublicProduct => Boolean(product)),
        })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })

    return () => {
      active = false
    }
  }, [favoriteIds, ready, version])

  async function handleRemove(productId: string) {
    setRemoving(productId)

    try {
      await setFavorite(productId, false)
      setState((current) =>
        current.status === 'ready'
          ? {
              status: 'ready',
              products: current.products.filter(
                (product) => product.id !== productId,
              ),
            }
          : current,
      )
      showToast(t('account.favoriteRemoved'), { tone: 'success' })
    } catch {
      showToast(t('common.errorText'), { tone: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">
        {t('account.favorites')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {t('account.favoritesSubtitle')}
      </p>

      <div className="mt-6">
        {!ready || state.status === 'loading' ? (
          <ProductGridSkeleton count={4} />
        ) : state.status === 'error' ? (
          <ErrorState
            message={t('account.loadError')}
            onRetry={() => {
              setState({ status: 'loading' })
              setVersion((current) => current + 1)
            }}
          />
        ) : state.products.length === 0 ? (
          <EmptyState>
            <span className="block">{t('account.favoritesEmpty')}</span>
            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
            >
              {t('account.ordersEmptyCta')}
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
            {state.products.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard product={product} showStore showFavorite={false} />
                <button
                  type="button"
                  disabled={removing === product.id}
                  onClick={() => void handleRemove(product.id)}
                  aria-label={t('account.removeFavorite')}
                  className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/95 text-slate-900 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50"
                >
                  <HeartIcon className="size-4" fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

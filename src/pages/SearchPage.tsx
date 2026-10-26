import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listPublicProducts, type PublicProduct } from '../api/catalog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid'
import { SearchBar } from '../components/SearchBar'
import { useI18n } from '../lib/i18n'
import { normalizeSearchQuery } from '../lib/search'

type SearchState = {
  requestKey: string
  status: 'ready' | 'error'
  products: PublicProduct[]
}

export function SearchPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const query = normalizeSearchQuery(searchParams.get('q') ?? '')
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<SearchState>({
    requestKey: '',
    status: 'ready',
    products: [],
  })

  useEffect(() => {
    if (!query) return

    let active = true
    const requestKey = `${query}:${version}`

    void listPublicProducts({ query })
      .then((products) => {
        if (active) {
          setState({ requestKey, status: 'ready', products })
        }
      })
      .catch(() => {
        if (active) {
          setState({ requestKey, status: 'error', products: [] })
        }
      })

    return () => {
      active = false
    }
  }, [query, version])

  const requestKey = `${query}:${version}`
  const loading = Boolean(query) && state.requestKey !== requestKey

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('search.title')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{t('search.subtitle')}</p>
      <SearchBar key={query} initialQuery={query} className="mt-4 max-w-2xl" />

      <div className="mt-6">
        {!query ? (
          <EmptyState>{t('search.emptyQuery')}</EmptyState>
        ) : loading ? (
          <ProductGridSkeleton count={8} />
        ) : state.status === 'error' ? (
          <ErrorState
            onRetry={() => setVersion((current) => current + 1)}
            message={t('search.error')}
          />
        ) : state.products.length === 0 ? (
          <EmptyState>{t('search.noResults')}</EmptyState>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {t('search.resultsFor')}{' '}
              <span className="text-emerald-700">“{query}”</span>
            </h2>
            <div className="mt-3">
              <ProductGrid products={state.products} showStore />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

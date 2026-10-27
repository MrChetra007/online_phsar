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
      <div className="rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          {t('nav.shop')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t('search.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{t('search.subtitle')}</p>
        <SearchBar
          key={query}
          initialQuery={query}
          className="mt-6 max-w-2xl"
        />
      </div>

      <div className="mt-8">
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
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                “{query}”
              </span>
            </h2>
            <div className="mt-4">
              <ProductGrid products={state.products} showStore />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

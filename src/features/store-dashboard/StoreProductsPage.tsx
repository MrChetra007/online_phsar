import { Link } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PackageIcon } from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import { StoreProductsSection } from './StoreProductsSection'
import { useMyStore } from './useMyStore'

export function StoreProductsPage() {
  const { t } = useI18n()
  const { store, loading, failed, reload } = useMyStore()

  if (loading && !store) return <LoadingState />
  if (failed) return <ErrorState onRetry={reload} />

  if (!store) {
    return (
      <section className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('store.productsTitle')}
        </h1>
        <p className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-slate-600">
          {t('store.onboardingTitle')}
        </p>
        <Link
          to="/store"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          {t('store.backToDashboard')}
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            {t('storeNav.workspace')}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t('store.productsTitle')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('store.productsSubtitle')}
          </p>
        </div>
        {store.status !== 'suspended' ? (
          <Link
            to="/store/products/new"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            <PackageIcon className="size-4" />
            {t('store.addProduct')}
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <StoreProductsSection store={store} showHeading={false} />
      </div>
    </section>
  )
}

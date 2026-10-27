import type { PublicProduct } from '../api/catalog'
import { useI18n } from '../lib/i18n'
import { ProductCard } from './ProductCard'
import { Skeleton } from './Skeleton'

const GRID = 'grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4'

export function ProductGrid({
  products,
  showStore = false,
}: {
  products: PublicProduct[]
  showStore?: boolean
}) {
  return (
    <div className={GRID}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} showStore={showStore} />
      ))}
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  const { t } = useI18n()

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <div className={GRID} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white"
          >
            <Skeleton className="aspect-[4/5]" />
            <div className="space-y-2.5 p-4">
              <Skeleton className="h-2.5 w-1/2 rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="mt-4 h-5 w-2/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

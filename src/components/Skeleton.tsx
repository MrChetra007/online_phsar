export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={['animate-pulse bg-slate-200', className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}

import type { ReactNode } from 'react'
import { SparklesIcon } from './icons'

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <SparklesIcon className="size-6" />
      </span>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600">
        {children}
      </p>
    </div>
  )
}

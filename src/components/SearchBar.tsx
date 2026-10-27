import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { normalizeSearchQuery } from '../lib/search'
import { SearchIcon } from './icons'

export function SearchBar({
  initialQuery = '',
  className = '',
  compact = false,
}: {
  initialQuery?: string
  className?: string
  compact?: boolean
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = normalizeSearchQuery(query)
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={['relative', className].filter(Boolean).join(' ')}
    >
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t('search.placeholder')}
        placeholder={t('search.placeholder')}
        maxLength={100}
        enterKeyHint="search"
        className={[
          'block w-full rounded-full border border-stone-200 bg-white py-3 pl-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/70',
          compact ? 'pr-14' : 'pr-28',
        ].join(' ')}
      />
      <button
        type="submit"
        aria-label={compact ? t('search.action') : undefined}
        className={[
          'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-emerald-700 text-white transition-colors hover:bg-emerald-800',
          compact
            ? 'grid size-9 place-items-center'
            : 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold',
        ].join(' ')}
      >
        <SearchIcon className="size-4" />
        <span className={compact ? 'sr-only' : ''}>{t('search.action')}</span>
      </button>
    </form>
  )
}

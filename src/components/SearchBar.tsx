import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { normalizeSearchQuery } from '../lib/search'
import { Button } from './Button'

export function SearchBar({
  initialQuery = '',
  className = '',
}: {
  initialQuery?: string
  className?: string
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
      className={['flex flex-col gap-2 sm:flex-row', className]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t('search.placeholder')}
        placeholder={t('search.placeholder')}
        maxLength={100}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <Button type="submit" className="shrink-0">
        {t('search.action')}
      </Button>
    </form>
  )
}

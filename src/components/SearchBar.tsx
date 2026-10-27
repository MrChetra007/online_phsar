import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { listProductSuggestions, type ProductSuggestion } from '../api/catalog'
import { useI18n } from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { normalizeSearchQuery } from '../lib/search'
import { ArrowRightIcon, SearchIcon } from './icons'

type SuggestionStatus = 'idle' | 'loading' | 'ready' | 'error'

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
  const listboxId = useId()
  const rootRef = useRef<HTMLFormElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [suggestionState, setSuggestionState] = useState<{
    term: string
    status: SuggestionStatus
    items: ProductSuggestion[]
  }>({ term: '', status: 'idle', items: [] })
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null)

  const term = normalizeSearchQuery(query)
  const showPanel = open && term.length >= 2
  const suggestions = suggestionState.term === term ? suggestionState.items : []
  const status: SuggestionStatus =
    suggestionState.term === term
      ? suggestionState.status
      : showPanel
        ? 'loading'
        : 'idle'
  const activeOptionId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined

  const updatePanelPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = Math.min(rect.width, window.innerWidth - 16)
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < 320 && rect.top > spaceBelow

    setPanelStyle({
      position: 'fixed',
      left,
      width,
      zIndex: 80,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
    })
  }, [])

  useLayoutEffect(() => {
    if (!showPanel) return

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)

    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [showPanel, updatePanelPosition])

  useEffect(() => {
    if (!showPanel) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }

      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [showPanel])

  useEffect(() => {
    if (!showPanel) return

    let active = true
    const timeout = window.setTimeout(() => {
      const requestTerm = term
      setSuggestionState({ term: requestTerm, status: 'loading', items: [] })

      void listProductSuggestions(requestTerm)
        .then((items) => {
          if (!active) return
          setSuggestionState({ term: requestTerm, status: 'ready', items })
          setActiveIndex(-1)
        })
        .catch(() => {
          if (!active) return
          setSuggestionState({ term: requestTerm, status: 'error', items: [] })
          setActiveIndex(-1)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [showPanel, term])

  function submitSearch() {
    setOpen(false)
    setActiveIndex(-1)
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitSearch()
  }

  function selectSuggestion(suggestion: ProductSuggestion) {
    setOpen(false)
    setActiveIndex(-1)
    navigate(`/p/${suggestion.id}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (!showPanel) return
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    if (!showPanel) {
      if (event.key === 'ArrowDown' && term.length >= 2) {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) =>
        suggestions.length === 0
          ? -1
          : current < suggestions.length - 1
            ? current + 1
            : 0,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        suggestions.length === 0
          ? -1
          : current > 0
            ? current - 1
            : suggestions.length - 1,
      )
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    }
  }

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={handleSubmit}
      className={['relative', className].filter(Boolean).join(' ')}
    >
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        role="combobox"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => {
          if (term.length >= 2) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        aria-label={t('search.placeholder')}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={showPanel}
        aria-controls={
          showPanel && suggestions.length > 0 ? listboxId : undefined
        }
        aria-activedescendant={activeOptionId}
        autoComplete="off"
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

      {showPanel && panelStyle
        ? createPortal(
            <div ref={panelRef} style={panelStyle}>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-slate-950/15">
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {t('search.suggestions')}
                  </p>
                  {status === 'loading' && suggestions.length > 0 ? (
                    <span className="text-xs text-slate-400">
                      {t('search.suggestionsLoading')}
                    </span>
                  ) : null}
                </div>

                {suggestions.length > 0 ? (
                  <div
                    id={listboxId}
                    role="listbox"
                    aria-label={t('search.suggestions')}
                    className="max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto p-1.5"
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        role="option"
                        id={`${listboxId}-option-${index}`}
                        aria-selected={activeIndex === index}
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectSuggestion(suggestion)}
                        className={[
                          'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                          activeIndex === index
                            ? 'bg-emerald-50'
                            : 'hover:bg-stone-50',
                        ].join(' ')}
                      >
                        <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                          {suggestion.imageUrl ? (
                            <img
                              src={suggestion.imageUrl}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="grid size-full place-items-center text-sm font-bold text-stone-500">
                              {suggestion.name.trim().slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {suggestion.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            {suggestion.storeName ? (
                              <>
                                <span className="truncate">
                                  {suggestion.storeName}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            ) : null}
                            <span className="shrink-0 font-semibold text-slate-700">
                              {formatMoney(suggestion.price)}
                            </span>
                          </span>
                        </span>
                        <ArrowRightIcon className="size-4 shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p role="status" className="px-4 py-5 text-sm text-slate-500">
                    {status === 'error'
                      ? t('search.suggestionsError')
                      : status === 'loading'
                        ? t('search.suggestionsLoading')
                        : t('search.noSuggestions')}
                  </p>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={submitSearch}
                  className="flex w-full items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 text-left text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  <span className="truncate">
                    {t('search.searchFor')}{' '}
                    <span className="font-normal text-slate-600">“{term}”</span>
                  </span>
                  <ArrowRightIcon className="size-4 shrink-0" />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </form>
  )
}

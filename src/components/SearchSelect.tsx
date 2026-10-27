import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { CheckIcon, ChevronDownIcon, SearchIcon } from './icons'

export type SearchSelectOption = {
  value: string
  label: string
  keywords?: string
}

type SearchSelectProps = {
  label: string
  value: string
  options: SearchSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  emptyText: string
  hint?: string
  error?: string
  required?: boolean
  name?: string
}

export function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  emptyText,
  hint,
  error,
  required,
  name,
}: SearchSelectProps) {
  const generatedId = useId()
  const inputId = `${generatedId}-input`
  const listboxId = `${generatedId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const selectedLabel = selected?.label ?? value
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filterText =
    normalizedQuery === selectedLabel.trim().toLocaleLowerCase()
      ? ''
      : normalizedQuery
  const filtered = filterText
    ? options.filter((option) =>
        `${option.label} ${option.keywords ?? ''}`
          .toLocaleLowerCase()
          .includes(filterText),
      )
    : options
  const activeOptionId =
    open && activeIndex >= 0 && activeIndex < filtered.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined
  const inputValue = open ? query : selectedLabel

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
      setActiveIndex(-1)
      setQuery('')
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  function close() {
    setOpen(false)
    setActiveIndex(-1)
    setQuery('')
  }

  function openList() {
    setOpen(true)
    setQuery('')
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }

  function select(option: SearchSelectOption) {
    onChange(option.value)
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (!open) return
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
      if (filtered.length === 0) return

      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        if (current < 0) return direction > 0 ? 0 : filtered.length - 1
        return (current + direction + filtered.length) % filtered.length
      })
      return
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault()
      const option =
        filtered[activeIndex] ?? (filtered.length === 1 ? filtered[0] : null)
      if (option) select(option)
    }
  }

  return (
    <div ref={rootRef} className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          id={inputId}
          name={name}
          role="combobox"
          type="text"
          value={inputValue}
          onChange={(event) => {
            setOpen(true)
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onFocus={openList}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null
            if (next && rootRef.current?.contains(next)) return
            close()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error || hint ? `${inputId}-description` : undefined
          }
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          className={[
            'block w-full rounded-2xl border bg-stone-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-stone-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/70',
          ].join(' ')}
        />
        <ChevronDownIcon
          className={[
            'pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl shadow-emerald-950/10"
          >
            {filtered.length > 0 ? (
              filtered.map((option, index) => (
                <button
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                    index === activeIndex
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-700 hover:bg-stone-50',
                  ].join(' ')}
                >
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <CheckIcon className="size-4 shrink-0 text-emerald-700" />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-slate-500">{emptyText}</p>
            )}
          </div>
        ) : null}
      </div>
      {error || hint ? (
        <p
          id={`${inputId}-description`}
          className={error ? 'text-sm text-red-600' : 'text-sm text-slate-500'}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}

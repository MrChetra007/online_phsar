import { useId, type ComponentProps } from 'react'

type SelectProps = ComponentProps<'select'> & {
  label: string
  hint?: string
  error?: string
}

export function Select({
  label,
  hint,
  error,
  id,
  className = '',
  children,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const describedBy = error ?? hint

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy ? `${selectId}-description` : undefined}
        className={[
          'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </select>
      {error || hint ? (
        <p
          id={`${selectId}-description`}
          className={error ? 'text-sm text-red-600' : 'text-sm text-slate-500'}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}

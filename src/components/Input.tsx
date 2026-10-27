import { useId, type ComponentProps } from 'react'

type InputProps = ComponentProps<'input'> & {
  label: string
  hint?: string
  error?: string
}

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ?? hint

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy ? `${inputId}-description` : undefined}
        className={[
          'block w-full rounded-2xl border bg-stone-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-stone-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/70',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
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

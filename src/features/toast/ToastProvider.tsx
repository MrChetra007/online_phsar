import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircleIcon,
  CheckIcon,
  CloseIcon,
  InfoIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import {
  ToastContext,
  type ToastAction,
  type ToastOptions,
  type ToastTone,
} from './context'

const MAX_TOASTS = 4

type ToastItem = {
  id: string
  message: string
  tone: ToastTone
  duration: number
  action?: ToastAction
}

const toneStyles: Record<
  ToastTone,
  { icon: typeof CheckIcon; iconClass: string; accent: string }
> = {
  success: {
    icon: CheckIcon,
    iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    accent: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircleIcon,
    iconClass: 'bg-red-50 text-red-700 ring-red-100',
    accent: 'bg-red-500',
  },
  warning: {
    icon: AlertCircleIcon,
    iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
    accent: 'bg-amber-500',
  },
  info: {
    icon: InfoIcon,
    iconClass: 'bg-sky-50 text-sky-700 ring-sky-100',
    accent: 'bg-sky-500',
  },
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const { t } = useI18n()
  const tone = toneStyles[toast.tone]
  const Icon = tone.icon

  useEffect(() => {
    if (toast.duration <= 0) return

    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => window.clearTimeout(timer)
  }, [onDismiss, toast.duration, toast.id])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      className="toast-enter pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 p-3.5 pr-2.5 shadow-2xl shadow-emerald-950/15 backdrop-blur-md"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`}
      />
      <span
        aria-hidden="true"
        className={`ml-1 grid size-8 shrink-0 place-items-center rounded-full ring-1 ${tone.iconClass}`}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium leading-relaxed text-slate-800">
          {toast.message}
        </p>
        {toast.action ? (
          <Link
            to={toast.action.to}
            onClick={() => onDismiss(toast.id)}
            className="mt-1 inline-flex text-sm font-semibold text-emerald-700 hover:underline"
          >
            {toast.action.label}
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={t('toast.dismiss')}
        className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-stone-100 hover:text-slate-700"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const next: ToastItem = {
        id: crypto.randomUUID(),
        message,
        tone: options.tone ?? 'success',
        duration: options.duration ?? 4200,
        action: options.action,
      }

      setToasts((current) => [...current, next].slice(-MAX_TOASTS))
    },
    [],
  )

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-4 top-4 z-[90] flex flex-col items-stretch gap-2 sm:left-auto sm:right-6 sm:top-6 sm:w-[min(24rem,calc(100vw-3rem))]">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export type ToastAction = {
  label: string
  to: string
}

export type ToastOptions = {
  tone?: ToastTone
  duration?: number
  action?: ToastAction
}

export type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

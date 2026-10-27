import { Component, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import { Button } from './Button'

type BoundaryProps = {
  fallback: ReactNode
  children: ReactNode
}

type BoundaryState = {
  failed: boolean
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n()

  return (
    <Boundary
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t('common.errorTitle')}
          </h1>
          <p className="mt-2 max-w-md text-slate-600">
            {t('common.errorText')}
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </main>
      }
    >
      {children}
    </Boundary>
  )
}

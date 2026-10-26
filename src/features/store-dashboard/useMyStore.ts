import { useCallback, useEffect, useState } from 'react'
import { getMyStore, type StoreWithPrivate } from '../../api/stores'
import { useAuth } from '../auth/context'

type MyStoreState = {
  data: StoreWithPrivate | null
  loading: boolean
  failed: boolean
}

export function useMyStore() {
  const { session, initializing } = useAuth()
  const userId = session?.user.id

  const [state, setState] = useState<MyStoreState>({
    data: null,
    loading: true,
    failed: false,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!userId) return

    let active = true

    void getMyStore(userId)
      .then((next) => {
        if (active) {
          setState((current) => ({ ...current, data: next }))
        }
      })
      .catch(() => {
        if (active) {
          setState((current) => ({ ...current, failed: true }))
        }
      })
      .finally(() => {
        if (active) {
          setState((current) => ({ ...current, loading: false }))
        }
      })

    return () => {
      active = false
    }
  }, [userId, version])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, failed: false, loading: true }))
    setVersion((current) => current + 1)
  }, [])

  return {
    userId,
    initializing,
    data: state.data,
    store: state.data?.store ?? null,
    loading: state.loading,
    failed: state.failed,
    reload,
  }
}

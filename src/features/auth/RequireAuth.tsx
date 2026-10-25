import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../../components/LoadingState'
import { useAuth } from './context'

export function RequireAuth() {
  const { session, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <LoadingState />

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}

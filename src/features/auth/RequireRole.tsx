import { Navigate, Outlet } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { useI18n } from '../../lib/i18n'
import { homeForRole, type UserRole } from '../../lib/roles'
import { useAuth } from './context'

export function RequireRole({ role }: { role: UserRole }) {
  const { t } = useI18n()
  const { profile, profileLoading, profileError, refreshProfile } = useAuth()

  if (profileError) {
    return (
      <ErrorState
        message={t(profileError)}
        onRetry={() => void refreshProfile()}
      />
    )
  }

  if (profileLoading || !profile) return <LoadingState />

  if (profile.role !== role) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  return <Outlet />
}

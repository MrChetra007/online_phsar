import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../../api/auth'
import type { TranslationKey } from '../../lib/i18n/translations'
import type { SignupRole, UserRole } from '../../lib/roles'

export type RegisterResult = {
  role: UserRole | null
  needsEmailConfirmation: boolean
}

export type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  initializing: boolean
  profileLoading: boolean
  profileError: TranslationKey | null
  login: (email: string, password: string) => Promise<UserRole>
  register: (input: {
    fullName: string
    email: string
    password: string
    accountType: SignupRole
  }) => Promise<RegisterResult>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

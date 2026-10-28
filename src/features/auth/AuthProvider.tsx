import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getMyProfile,
  getSession,
  onAuthStateChange,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  type Profile,
} from '../../api/auth'
import type { TranslationKey } from '../../lib/i18n/translations'
import { AuthContext, type RegisterResult } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<TranslationKey | null>(null)

  const sessionUserId = session?.user.id

  useEffect(() => {
    let active = true

    void getSession()
      .then((nextSession) => {
        if (!active) return
        setSession(nextSession)
        setInitializing(false)
      })
      .catch(() => {
        if (!active) return
        setInitializing(false)
      })

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (!active) return
      setSession(nextSession)
      setInitializing(false)

      if (!nextSession) {
        setProfile(null)
        setProfileError(null)
        setProfileLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    setProfileError(null)

    try {
      const nextProfile = await getMyProfile(userId)
      setProfile(nextProfile)
    } catch {
      setProfile(null)
      setProfileError('auth.errorProfileMissing')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!sessionUserId) return
    if (profile?.id === sessionUserId) return

    const timeout = setTimeout(() => {
      void loadProfile(sessionUserId)
    }, 0)

    return () => clearTimeout(timeout)
  }, [sessionUserId, profile?.id, loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    const data = await signInWithEmail(email, password)
    if (!data.user) throw new Error('Missing user after sign in')

    setSession(data.session)
    const nextProfile = await getMyProfile(data.user.id)
    setProfile(nextProfile)
    return nextProfile.role
  }, [])

  const register = useCallback(
    async (input: {
      fullName: string
      email: string
      password: string
      accountType: 'customer' | 'store_owner'
    }): Promise<RegisterResult> => {
      const data = await signUpWithEmail(
        input.fullName,
        input.email,
        input.password,
        input.accountType,
      )

      if (!data.session || !data.user) {
        return { role: null, needsEmailConfirmation: true }
      }

      setSession(data.session)
      const nextProfile = await getMyProfile(data.user.id)
      setProfile(nextProfile)

      return { role: nextProfile.role, needsEmailConfirmation: false }
    },
    [],
  )

  const logout = useCallback(async () => {
    await signOut().catch(() => undefined)
    setSession(null)
    setProfile(null)
    setProfileError(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (sessionUserId) await loadProfile(sessionUserId)
  }, [sessionUserId, loadProfile])

  const value = useMemo(
    () => ({
      session,
      profile,
      initializing,
      profileLoading,
      profileError,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [
      session,
      profile,
      initializing,
      profileLoading,
      profileError,
      login,
      register,
      logout,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

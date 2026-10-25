import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { authErrorKey } from '../../lib/authErrors'
import { useI18n, type TranslationKey } from '../../lib/i18n'
import { homeForRole } from '../../lib/roles'
import { useAuth } from './context'

export function LoginPage() {
  const { t } = useI18n()
  const {
    session,
    profile,
    initializing,
    profileError,
    login,
    refreshProfile,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (initializing) return <LoadingState />

  if (session) {
    if (profile) return <Navigate to={homeForRole(profile.role)} replace />
    if (profileError) {
      return (
        <ErrorState
          message={t(profileError)}
          onRetry={() => void refreshProfile()}
        />
      )
    }
    return <LoadingState />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorKey(null)

    if (!email.trim() || !password) {
      setErrorKey('auth.errorRequired')
      return
    }

    setSubmitting(true)
    try {
      const role = await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      const target =
        from && (from.startsWith('/store') || from.startsWith('/admin'))
          ? from
          : homeForRole(role)
      navigate(target, { replace: true })
    } catch (error) {
      setErrorKey(authErrorKey(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('auth.loginTitle')}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t('auth.loginSubtitle')}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label={t('auth.email')}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {errorKey ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {t(errorKey)}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t('common.loading') : t('auth.loginAction')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {t('auth.noAccount')}{' '}
          <Link
            to="/signup"
            className="font-medium text-emerald-700 hover:underline"
          >
            {t('nav.signup')}
          </Link>
        </p>
      </div>
    </section>
  )
}

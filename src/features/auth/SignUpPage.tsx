import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { LoadingState } from '../../components/LoadingState'
import { authErrorKey } from '../../lib/authErrors'
import { useI18n, type TranslationKey } from '../../lib/i18n'
import { homeForRole } from '../../lib/roles'
import { AuthShell } from './AuthShell'
import { useAuth } from './context'

export function SignUpPage() {
  const { t } = useI18n()
  const {
    session,
    profile,
    initializing,
    profileError,
    register,
    refreshProfile,
  } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [noticeKey, setNoticeKey] = useState<TranslationKey | null>(null)
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
    setNoticeKey(null)

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorKey('auth.errorRequired')
      return
    }
    if (fullName.trim().length < 2) {
      setErrorKey('auth.errorNameShort')
      return
    }
    if (!email.includes('@')) {
      setErrorKey('auth.errorInvalidEmail')
      return
    }
    if (password.length < 8) {
      setErrorKey('auth.errorPasswordShort')
      return
    }
    if (password !== confirmPassword) {
      setErrorKey('auth.errorPasswordMismatch')
      return
    }

    setSubmitting(true)
    try {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      })

      if (result.needsEmailConfirmation || !result.role) {
        setNoticeKey('auth.confirmEmailNotice')
        return
      }

      navigate(homeForRole(result.role), { replace: true })
    } catch (error) {
      setErrorKey(authErrorKey(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupSubtitle')}
      footer={
        <p className="text-center text-sm text-slate-600">
          {t('auth.haveAccount')}{' '}
          <Link
            to="/login"
            className="font-semibold text-emerald-700 hover:underline"
          >
            {t('nav.login')}
          </Link>
        </p>
      }
    >
      {noticeKey ? (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
        >
          {t(noticeKey)}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label={t('auth.fullName')}
          type="text"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
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
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Input
          label={t('auth.confirmPassword')}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
          {submitting ? t('common.loading') : t('auth.signupAction')}
        </Button>
      </form>
    </AuthShell>
  )
}

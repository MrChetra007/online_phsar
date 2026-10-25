import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { homeForRole } from '../lib/roles'
import { useAuth } from '../features/auth/context'
import { LanguageSwitcher } from './LanguageSwitcher'

const currentYear = new Date().getFullYear()

export function AppShell() {
  const { t } = useI18n()
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const dashboardPath = profile ? homeForRole(profile.role) : null
  const dashboardLabel =
    profile?.role === 'super_admin'
      ? t('nav.adminPanel')
      : t('nav.storeDashboard')

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-emerald-700 focus:shadow"
      >
        {t('common.skipToContent')}
      </a>

      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-slate-900"
            aria-label={t('app.name')}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-base font-bold text-white"
            >
              K
            </span>
            <span className="text-base font-semibold">{t('app.name')}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {dashboardPath ? (
              <>
                <Link
                  to={dashboardPath}
                  className="rounded-lg px-2.5 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  {dashboardLabel}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12"
      >
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.tagline')}</p>
          <p>
            © {currentYear} {t('app.name')}. {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}

import { Suspense, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { LoadingState } from '../../components/LoadingState'
import {
  ClipboardListIcon,
  DashboardIcon,
  HeartIcon,
  HomeIcon,
  LogOutIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { useAuth } from '../auth/context'

type NavItem = {
  to: string
  labelKey: TranslationKey
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const navItems: NavItem[] = [
  {
    to: '/account',
    labelKey: 'account.overview',
    icon: DashboardIcon,
    end: true,
  },
  {
    to: '/account/orders',
    labelKey: 'account.orders',
    icon: ClipboardListIcon,
  },
  {
    to: '/account/favorites',
    labelKey: 'account.favorites',
    icon: HeartIcon,
  },
]

export function AccountLayout() {
  const { t } = useI18n()
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#account-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-sm font-bold text-white"
            >
              K
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
              {t('account.title')}
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Link
              to="/"
              aria-label={t('nav.home')}
              className="hidden size-9 place-items-center rounded-full text-slate-600 transition-colors hover:bg-stone-100 sm:grid"
            >
              <HomeIcon className="size-4" />
            </Link>
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={t('nav.logout')}
              className="grid size-9 place-items-center rounded-full text-slate-600 transition-colors hover:bg-stone-100"
            >
              <LogOutIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4">
          <nav
            aria-label={t('account.title')}
            className="-mb-px flex gap-1 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-ink text-slate-950'
                        : 'border-transparent text-slate-500 hover:text-slate-800',
                    ].join(' ')
                  }
                >
                  <Icon className="size-4" />
                  {t(item.labelKey)}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </header>

      <main
        id="account-main"
        className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10"
      >
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-2">
        <p className="border-t border-stone-200/80 pt-6 text-xs text-slate-500">
          {profile?.full_name
            ? `${t('common.signedInAs')} ${profile.full_name}`
            : null}
        </p>
      </footer>
    </div>
  )
}

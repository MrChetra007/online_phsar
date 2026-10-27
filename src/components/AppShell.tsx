import { Suspense } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { homeForRole } from '../lib/roles'
import { useAuth } from '../features/auth/context'
import { useCart } from '../features/cart'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LoadingState } from './LoadingState'
import { SearchBar } from './SearchBar'
import {
  ArrowRightIcon,
  CartIcon,
  HomeIcon,
  SearchIcon,
  StoreIcon,
  TruckIcon,
} from './icons'

const currentYear = new Date().getFullYear()

export function AppShell() {
  const { t } = useI18n()
  const { profile, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isShop =
    location.pathname.startsWith('/search') ||
    location.pathname.startsWith('/c/') ||
    location.pathname.startsWith('/p/') ||
    location.pathname.startsWith('/s/')
  const isTrack =
    location.pathname.startsWith('/track') ||
    location.pathname.startsWith('/pay/')
  const isSell = location.pathname === '/signup'

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
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-emerald-700 focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>

      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex h-16 items-center gap-3">
            <Link
              to="/"
              aria-label={t('app.name')}
              className="flex shrink-0 items-center gap-2.5 text-slate-900"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 text-base font-bold text-white shadow-lg shadow-emerald-900/20"
              >
                K
              </span>
              <span className="hidden text-base font-semibold tracking-tight sm:block">
                {t('app.name')}
              </span>
            </Link>

            {!isHome ? (
              <div className="hidden min-w-0 flex-1 md:block">
                <SearchBar compact className="mx-auto max-w-lg" />
              </div>
            ) : (
              <div className="hidden flex-1 md:block" />
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <Link
                to="/cart"
                aria-label={
                  itemCount > 0
                    ? `${t('nav.cart')}, ${itemCount}`
                    : t('nav.cart')
                }
                className="relative grid size-10 place-items-center rounded-full text-slate-700 transition-colors hover:bg-stone-100"
              >
                <CartIcon className="size-5" />
                {itemCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                ) : null}
              </Link>

              {dashboardPath ? (
                <>
                  <Link
                    to={dashboardPath}
                    aria-label={dashboardLabel}
                    className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 sm:inline-flex"
                  >
                    <StoreIcon className="size-4" />
                    <span className="hidden lg:inline">{dashboardLabel}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hidden rounded-full px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-stone-100 sm:block"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-100 sm:block"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-800"
                  >
                    {t('nav.signup')}
                  </Link>
                </>
              )}

              <LanguageSwitcher />
            </div>
          </div>

          {!isHome ? (
            <div className="pb-3 md:hidden">
              <SearchBar compact />
            </div>
          ) : null}

          <nav
            aria-label={t('nav.primary')}
            className="hidden items-center gap-1 border-t border-stone-100 py-2 text-sm md:flex"
          >
            <Link
              to="/"
              className="rounded-full px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-stone-100 hover:text-slate-950"
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/search"
              className="rounded-full px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-stone-100 hover:text-slate-950"
            >
              {t('nav.shop')}
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-stone-100 hover:text-slate-950"
            >
              <TruckIcon className="size-4" />
              {t('nav.track')}
            </Link>
            <Link
              to="/signup"
              className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              {t('nav.sell')}
              <ArrowRightIcon className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10"
      >
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-slate-900"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 text-base font-bold text-white"
              >
                K
              </span>
              <span className="text-base font-semibold tracking-tight">
                {t('app.name')}
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t('footer.explore')}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/search" className="hover:text-emerald-700">
                  {t('nav.shop')}
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-emerald-700">
                  {t('nav.track')}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-emerald-700">
                  {t('nav.cart')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t('footer.account')}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {dashboardPath ? (
                <>
                  <li>
                    <Link to={dashboardPath} className="hover:text-emerald-700">
                      {dashboardLabel}
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="hover:text-emerald-700"
                    >
                      {t('nav.logout')}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="hover:text-emerald-700">
                      {t('nav.login')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="hover:text-emerald-700">
                      {t('nav.sell')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t('footer.legal')}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/privacy" className="hover:text-emerald-700">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-emerald-700">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-100">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {currentYear} {t('app.name')}. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="transition hover:text-emerald-700">
                {t('footer.privacy')}
              </Link>
              <span className="text-stone-300">•</span>
              <Link to="/terms" className="transition hover:text-emerald-700">
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <nav
        aria-label={t('nav.primary')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-2">
          <Link
            to="/"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              isHome ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <HomeIcon className="size-5" />
            {t('nav.home')}
          </Link>
          <Link
            to="/search"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              isShop ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <SearchIcon className="size-5" />
            {t('nav.shop')}
          </Link>
          <Link
            to="/track"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              isTrack ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <TruckIcon className="size-5" />
            {t('nav.track')}
          </Link>
          <Link
            to="/signup"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              isSell ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <StoreIcon className="size-5" />
            {t('nav.sell')}
          </Link>
        </div>
      </nav>
    </div>
  )
}

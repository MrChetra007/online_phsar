import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getPublicSettings } from '../api/admin'
import { useI18n } from '../lib/i18n'
import { homeForRole } from '../lib/roles'
import { useAuth } from '../features/auth/context'
import { useCart } from '../features/cart'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LoadingState } from './LoadingState'
import { SearchBar } from './SearchBar'
import iconImg from '../assets/icon.jpg'
import brandImg from '../assets/brand.jpg'
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
  const { t, language } = useI18n()
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
  const isKhmer = language === 'km'

  const [platformContacts, setPlatformContacts] = useState<Record<string, string>>({})

  useEffect(() => {
    void getPublicSettings()
      .then((data) => setPlatformContacts(data))
      .catch(() => setPlatformContacts({}))
  }, [])

  const phone = platformContacts['shop_contact_phone'] || ''
  const facebookUrl = platformContacts['shop_facebook_url'] || ''
  const telegramUsername = platformContacts['shop_telegram_username'] || ''
  const hasContacts = phone || facebookUrl || telegramUsername

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
              className="flex shrink-0 items-center"
            >
              {/* Icon mark — always visible */}
              <img
                src={iconImg}
                alt=""
                aria-hidden="true"
                className="size-10 rounded-xl object-cover grayscale contrast-125 shadow-md shadow-emerald-900/20 sm:hidden"
              />
              {/* Full wordmark — visible on sm+ */}
              <img
                src={brandImg}
                alt={t('app.name')}
                className="hidden h-10 w-auto object-contain grayscale contrast-125 sm:block"
              />
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
              className="inline-flex items-center"
            >
              <img
                src={brandImg}
                alt={t('app.name')}
                className="h-10 w-auto object-contain grayscale contrast-125"
              />
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
              <li>
                <Link to="/contact" className="hover:text-emerald-700">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {hasContacts ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {isKhmer ? 'ទំនាក់ទំនង' : 'Contact'}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3.5 py-1.5 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z"
                      />
                    </svg>
                    {phone}
                  </a>
                ) : null}
                {facebookUrl ? (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3.5 py-1.5 transition-colors hover:border-[#1877F2]/40 hover:text-[#1877F2]"
                  >
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    {isKhmer ? 'Facebook' : 'Facebook'}
                  </a>
                ) : null}
                {telegramUsername ? (
                  <a
                    href={`https://t.me/${telegramUsername.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3.5 py-1.5 transition-colors hover:border-[#229ED9]/40 hover:text-[#229ED9]"
                  >
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    {telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
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

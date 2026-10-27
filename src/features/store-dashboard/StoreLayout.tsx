import { Suspense, useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Store } from '../../api/stores'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { LoadingState } from '../../components/LoadingState'
import { StoreStatusBadge } from '../../components/StoreStatusBadge'
import {
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClipboardListIcon,
  CloseIcon,
  DashboardIcon,
  ExternalLinkIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  PackageIcon,
  SettingsIcon,
  StoreIcon,
  WalletIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'
import { useAuth } from '../auth/context'
import { useMyStore } from './useMyStore'

const SIDEBAR_STORAGE_KEY = 'kos.storeSidebarCollapsed'

type NavItem = {
  to: string
  labelKey: TranslationKey
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const navItems: NavItem[] = [
  {
    to: '/store',
    labelKey: 'storeNav.overview',
    icon: DashboardIcon,
    end: true,
  },
  {
    to: '/store/orders',
    labelKey: 'storeOrders.title',
    icon: ClipboardListIcon,
  },
  {
    to: '/store/products',
    labelKey: 'store.productsTitle',
    icon: PackageIcon,
  },
  {
    to: '/store/statement',
    labelKey: 'store.statement',
    icon: WalletIcon,
  },
  {
    to: '/store/settings',
    labelKey: 'storeNav.settings',
    icon: SettingsIcon,
  },
]

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function StoreSidebar({
  collapsed,
  mobile = false,
  store,
  storeLoading,
  onNavigate,
  onClose,
  onToggleCollapse,
  onLogout,
}: {
  collapsed: boolean
  mobile?: boolean
  store: Store | null
  storeLoading: boolean
  onNavigate?: () => void
  onClose?: () => void
  onToggleCollapse?: () => void
  onLogout: () => void
}) {
  const { t, language, setLanguage } = useI18n()
  const storeName = store?.name ?? t('storeNav.noStore')
  const storeInitial = store?.name.trim().slice(0, 1).toUpperCase()

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div
        className={[
          'flex h-16 shrink-0 items-center border-b border-white/10',
          collapsed ? 'justify-center px-3' : 'gap-3 px-4',
        ].join(' ')}
      >
        <Link
          to="/store"
          onClick={onNavigate}
          aria-label={t('storeNav.workspace')}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-base font-bold text-emerald-950 shadow-lg shadow-emerald-950/20"
          >
            K
          </span>
          {!collapsed ? (
            <span className="truncate text-sm font-semibold tracking-tight">
              {t('storeNav.workspace')}
            </span>
          ) : null}
        </Link>

        {mobile && onClose ? (
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label={t('storeNav.closeMenu')}
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-full text-emerald-50/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="size-5" />
          </button>
        ) : null}
      </div>

      <div className={collapsed ? 'px-2 py-4' : 'px-3 py-4'}>
        <Link
          to="/store"
          onClick={onNavigate}
          title={collapsed ? storeName : undefined}
          aria-label={collapsed ? storeName : undefined}
          className={[
            'flex items-center rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10',
            collapsed ? 'justify-center p-2' : 'gap-3 p-3',
          ].join(' ')}
        >
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-500/15 text-sm font-bold text-emerald-100">
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt=""
                className="size-full object-cover"
              />
            ) : storeInitial ? (
              storeInitial
            ) : (
              <StoreIcon className="size-5" />
            )}
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {storeLoading ? t('common.loading') : storeName}
              </span>
              {store ? (
                <span className="mt-1 flex items-center gap-2">
                  <StoreStatusBadge status={store.status} />
                  <span className="truncate text-[11px] text-emerald-50/50">
                    /s/{store.slug}
                  </span>
                </span>
              ) : (
                <span className="mt-1 block text-xs text-emerald-50/50">
                  {t('store.onboardingTitle')}
                </span>
              )}
            </span>
          ) : null}
        </Link>
      </div>

      <nav
        aria-label={t('storeNav.navigation')}
        className="flex-1 overflow-y-auto px-2 pb-3"
      >
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? t(item.labelKey) : undefined}
                  aria-label={collapsed ? t(item.labelKey) : undefined}
                  className={({ isActive }) =>
                    [
                      'flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors',
                      collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                      isActive
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-emerald-50/70 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="size-5 shrink-0" />
                  {!collapsed ? <span>{t(item.labelKey)}</span> : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/10 p-2">
        <Link
          to="/"
          onClick={onNavigate}
          title={collapsed ? t('nav.home') : undefined}
          aria-label={collapsed ? t('nav.home') : undefined}
          className={[
            'flex items-center rounded-xl py-2 text-sm text-emerald-50/70 transition-colors hover:bg-white/10 hover:text-white',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          ].join(' ')}
        >
          <HomeIcon className="size-5 shrink-0" />
          {!collapsed ? <span>{t('nav.home')}</span> : null}
        </Link>

        {store?.status === 'active' ? (
          <Link
            to={`/s/${store.slug}`}
            onClick={onNavigate}
            title={collapsed ? t('store.publicLink') : undefined}
            aria-label={collapsed ? t('store.publicLink') : undefined}
            className={[
              'flex items-center rounded-xl py-2 text-sm text-emerald-50/70 transition-colors hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center px-2' : 'gap-3 px-3',
            ].join(' ')}
          >
            <ExternalLinkIcon className="size-5 shrink-0" />
            {!collapsed ? <span>{t('store.publicLink')}</span> : null}
          </Link>
        ) : null}

        <div className={collapsed ? 'py-1' : 'px-1 py-2'}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setLanguage(language === 'km' ? 'en' : 'km')}
              aria-label={t('nav.language')}
              title={t('nav.language')}
              className="mx-auto grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-emerald-50/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {language.toUpperCase()}
            </button>
          ) : (
            <LanguageSwitcher />
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? t('nav.logout') : undefined}
          aria-label={collapsed ? t('nav.logout') : undefined}
          className={[
            'flex w-full items-center rounded-xl py-2 text-sm text-emerald-50/70 transition-colors hover:bg-white/10 hover:text-white',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          ].join(' ')}
        >
          <LogOutIcon className="size-5 shrink-0" />
          {!collapsed ? <span>{t('nav.logout')}</span> : null}
        </button>

        {!mobile && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={
              collapsed
                ? t('storeNav.expandSidebar')
                : t('storeNav.collapseSidebar')
            }
            aria-label={
              collapsed
                ? t('storeNav.expandSidebar')
                : t('storeNav.collapseSidebar')
            }
            className={[
              'flex w-full items-center rounded-xl py-2 text-sm text-emerald-50/70 transition-colors hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center px-2' : 'gap-3 px-3',
            ].join(' ')}
          >
            {collapsed ? (
              <ChevronsRightIcon className="size-5 shrink-0" />
            ) : (
              <ChevronsLeftIcon className="size-5 shrink-0" />
            )}
            {!collapsed ? <span>{t('storeNav.collapseSidebar')}</span> : null}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function StoreLayout() {
  const { t } = useI18n()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { store, loading } = useMyStore()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
    } catch {
      return
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <StoreSidebar
      collapsed={collapsed}
      store={store}
      storeLoading={loading}
      onLogout={() => void handleLogout()}
      onToggleCollapse={toggleCollapsed}
    />
  )

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#store-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-emerald-700 focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>

      <div className="flex min-h-dvh">
        <aside
          className={[
            'sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-emerald-950/20 shadow-2xl shadow-emerald-950/5 transition-[width] duration-300 lg:block',
            collapsed ? 'w-20' : 'w-72',
          ].join(' ')}
        >
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t('storeNav.openMenu')}
              aria-expanded={mobileOpen}
              aria-controls="store-mobile-menu"
              className="grid size-10 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-stone-100"
            >
              <MenuIcon className="size-5" />
            </button>
            <Link
              to="/store"
              className="flex min-w-0 items-center gap-2.5 text-slate-900"
            >
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-900 text-sm font-bold text-white"
              >
                K
              </span>
              <span className="truncate text-sm font-semibold">
                {store?.name ?? t('storeNav.workspace')}
              </span>
            </Link>
            <div className="ml-auto shrink-0">
              <LanguageSwitcher />
            </div>
          </header>

          <main
            id="store-main"
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
          >
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setMobileOpen(false)}
            aria-label={t('storeNav.closeMenu')}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <div
            id="store-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('storeNav.navigation')}
            className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] shadow-2xl shadow-slate-950/40"
          >
            <StoreSidebar
              collapsed={false}
              mobile
              store={store}
              storeLoading={loading}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
              onLogout={() => void handleLogout()}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

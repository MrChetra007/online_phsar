import { NavLink } from 'react-router-dom'
import { useI18n } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n/translations'

const links: { to: string; labelKey: TranslationKey; end?: boolean }[] = [
  { to: '/admin', labelKey: 'admin.overview', end: true },
  { to: '/admin/orders', labelKey: 'admin.manageOrders' },
  { to: '/admin/payments', labelKey: 'admin.managePayments' },
  { to: '/admin/disputes', labelKey: 'admin.manageDisputes' },
  { to: '/admin/settings', labelKey: 'admin.settings' },
  { to: '/admin/categories', labelKey: 'admin.manageCategories' },
]

export function AdminNav() {
  const { t } = useI18n()

  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            [
              'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
            ].join(' ')
          }
        >
          {t(link.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}

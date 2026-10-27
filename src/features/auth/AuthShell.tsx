import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardListIcon,
  StoreIcon,
  WalletIcon,
} from '../../components/icons'
import { useI18n } from '../../lib/i18n'

const features = [
  { icon: ClipboardListIcon, labelKey: 'auth.featureOrders' },
  { icon: WalletIcon, labelKey: 'auth.featurePayouts' },
  { icon: StoreIcon, labelKey: 'auth.featureStorefront' },
] as const

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  const { t } = useI18n()

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)] lg:items-stretch">
      <div className="relative isolate flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-ink px-6 py-8 text-white shadow-2xl shadow-emerald-950/10 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-72 rounded-full bg-amber-300/10 blur-3xl"
        />

        <div>
          <Link
            to="/"
            aria-label={t('app.name')}
            className="inline-flex items-center gap-2.5"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-base font-bold text-emerald-950 shadow-lg shadow-emerald-950/20"
            >
              K
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {t('app.name')}
            </span>
          </Link>

          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            {t('auth.workspaceEyebrow')}
          </p>
          <p className="mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t('auth.workspaceTitle')}
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-50/70 sm:text-base">
            {t('auth.workspaceText')}
          </p>
        </div>

        <ul className="mt-10 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <li
                key={feature.labelKey}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-emerald-50/80"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-200">
                  <Icon className="size-4" />
                </span>
                {t(feature.labelKey)}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex items-center rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8 lg:p-10">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {subtitle}
          </p>

          <div className="mt-7">{children}</div>
          <div className="mt-7">{footer}</div>
        </div>
      </div>
    </section>
  )
}

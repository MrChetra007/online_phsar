import type { ComponentProps } from 'react'

type IconProps = ComponentProps<'svg'>

function iconProps(className: string, props: IconProps) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    className,
    ...props,
  }
}

export function SearchIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function HomeIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m4 10 8-6 8 6" />
      <path d="M6 9.5V19h12V9.5" />
      <path d="M10 19v-5h4v5" />
    </svg>
  )
}

export function CartIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

export function ShieldCheckIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.4 7 9.7 4.1-1.3 7-5.3 7-9.7V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function TruckIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  )
}

export function StoreIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 10v9h16v-9" />
      <path d="M3 10 5 4h14l2 6" />
      <path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2" />
      <path d="M10 19v-5h4v5" />
    </svg>
  )
}

export function CheckIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export function SparklesIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
      <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      <path d="m5 15 .6 1.7 1.7.6-1.7.6L5 19.6l-.6-1.7-1.7-.6 1.7-.6L5 15Z" />
    </svg>
  )
}

export function DashboardIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function ClipboardListIcon({
  className = 'size-5',
  ...props
}: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h4" />
    </svg>
  )
}

export function PackageIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.5 7.8 7.5 4.3 7.5-4.3" />
      <path d="M12 12.1V21" />
      <path d="m8 5.2 8 4.5" />
    </svg>
  )
}

export function WalletIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M4 8h15" />
      <path d="M16 12h2" />
    </svg>
  )
}

export function CreditCardIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  )
}

export function ScaleIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M12 4v16" />
      <path d="M6 20h12" />
      <path d="M5 7h14" />
      <path d="m5 7-3 6h6L5 7Z" />
      <path d="m19 7-3 6h6l-3-6Z" />
    </svg>
  )
}

export function TagIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m4 4 7.5-.5L20 12l-8 8-8.5-8.5L4 4Z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </svg>
  )
}

export function SettingsIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  )
}

export function MenuIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

export function CloseIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  )
}

export function ChevronsLeftIcon({
  className = 'size-5',
  ...props
}: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m11 7-5 5 5 5" />
      <path d="m18 7-5 5 5 5" />
    </svg>
  )
}

export function ChevronsRightIcon({
  className = 'size-5',
  ...props
}: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="m13 7 5 5-5 5" />
      <path d="m6 7 5 5-5 5" />
    </svg>
  )
}

export function ExternalLinkIcon({
  className = 'size-5',
  ...props
}: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

export function LogOutIcon({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg {...iconProps(className, props)}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
    </svg>
  )
}

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

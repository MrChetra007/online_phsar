import { useCallback, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export interface KhqrCardProps {
  merchantName: string
  amount: number
  currency: 'USD' | 'KHR'
  qrData: string
  isExpired?: boolean
  className?: string
  onSave?: () => void
}

/**
 * Formats amount according to KHQR standards:
 * - USD: 2 decimal places with period decimal (e.g. "6.00")
 * - KHR: 0 decimal places with thousands separators (e.g. "24,000")
 */
export function formatAmount(amount: number, currency: 'USD' | 'KHR'): string {
  const numeric =
    typeof amount === 'number' && Number.isFinite(amount)
      ? amount
      : Number(amount) || 0

  if (currency === 'KHR') {
    return Math.round(numeric).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })
  }

  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function KhqrCard({
  merchantName,
  amount,
  currency,
  qrData,
  isExpired = false,
  className = '',
  onSave,
}: KhqrCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleSaveQr = useCallback(async () => {
    if (onSave) {
      onSave()
      return
    }

    try {
      setDownloading(true)
      const scale = 2
      const width = 320 * scale // 640px
      const height = 430 * scale // 860px
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 1. Draw Card Background (rounded rectangle)
      const radius = 24 * scale
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(0, 0, width, height, radius)
      ctx.fill()

      // 2. Draw Red Header with folded top-right corner
      const headerHeight = 56 * scale
      const foldSize = 22 * scale
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(width - foldSize, 0)
      ctx.lineTo(width, foldSize)
      ctx.lineTo(width, headerHeight)
      ctx.lineTo(0, headerHeight)
      ctx.lineTo(0, radius)
      ctx.arcTo(0, 0, radius, 0, radius)
      ctx.closePath()
      ctx.fillStyle = '#E1232E'
      ctx.fill()

      // 2b. Draw Fold Triangle (dog-ear)
      ctx.beginPath()
      ctx.moveTo(width - foldSize, 0)
      ctx.lineTo(width - foldSize, foldSize)
      ctx.lineTo(width, foldSize)
      ctx.closePath()
      ctx.fillStyle = '#9E1018'
      ctx.fill()
      ctx.restore()

      // 2c. Draw KHQR Logo in center of red header
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 ${22 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('KHQR', width / 2, headerHeight / 2)
      ctx.restore()

      // 3. Draw Merchant Name
      const padLeft = 16 * scale
      const textStartY = headerHeight + 16 * scale
      ctx.save()
      ctx.fillStyle = '#374151'
      ctx.font = `500 ${14 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(merchantName.toUpperCase(), padLeft, textStartY)

      // 4. Draw Amount
      const amountY = textStartY + 20 * scale
      const formatted = formatAmount(amount, currency)
      ctx.fillStyle = '#111827'
      ctx.font = `700 ${24 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      ctx.fillText(formatted, padLeft, amountY)

      // Currency suffix
      const amountMetrics = ctx.measureText(formatted)
      ctx.fillStyle = '#9CA3AF'
      ctx.font = `600 ${14 * scale}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      ctx.fillText(
        currency,
        padLeft + amountMetrics.width + 6 * scale,
        amountY + 8 * scale,
      )
      ctx.restore()

      // 5. Draw Dotted Divider & Notches
      const dividerY = headerHeight + 72 * scale
      const notchRadius = 12 * scale

      ctx.save()
      // Left Notch (cuts into card)
      ctx.fillStyle = '#f5f6f1'
      ctx.beginPath()
      ctx.arc(0, dividerY, notchRadius, -Math.PI / 2, Math.PI / 2)
      ctx.fill()

      // Right Notch
      ctx.beginPath()
      ctx.arc(width, dividerY, notchRadius, Math.PI / 2, (3 * Math.PI) / 2)
      ctx.fill()

      // Dotted Line
      ctx.beginPath()
      ctx.setLineDash([5 * scale, 5 * scale])
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1.5 * scale
      ctx.moveTo(notchRadius + 8 * scale, dividerY)
      ctx.lineTo(width - notchRadius - 8 * scale, dividerY)
      ctx.stroke()
      ctx.restore()

      // 6. Draw QR Code SVG onto canvas
      const qrSize = 240 * scale // 480px
      const qrX = (width - qrSize) / 2
      const qrY = dividerY + 12 * scale

      const svgEl = cardRef.current?.querySelector('svg.khqr-vector-svg')
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl)
        const svgBlob = new Blob([svgData], {
          type: 'image/svg+xml;charset=utf-8',
        })
        const url = URL.createObjectURL(svgBlob)
        const img = new Image()

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize)
            URL.revokeObjectURL(url)
            resolve()
          }
          img.onerror = reject
          img.src = url
        }).catch(() => null)
      }

      // 7. Draw center currency badge (max 15% of QR width with white ring)
      const badgeOuterRadius = 17 * scale
      const badgeInnerRadius = 13.5 * scale
      const centerX = width / 2
      const centerY = qrY + qrSize / 2

      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, badgeOuterRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(centerX, centerY, badgeInnerRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#E1232E'
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${13 * scale}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(currency === 'KHR' ? '៛' : '$', centerX, centerY + 0.5 * scale)
      ctx.restore()

      // 8. Trigger PNG download
      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const sanitized = merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      link.download = `khqr-${sanitized || 'merchant'}-${currency.toLowerCase()}-${formatted.replace(/[^0-9]/g, '')}.png`
      link.href = pngUrl
      link.click()
    } finally {
      setDownloading(false)
    }
  }, [merchantName, amount, currency, onSave])

  return (
    <div className={`mx-auto w-full max-w-[320px] ${className}`}>
      {/* KHQR Physical Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-lg shadow-stone-900/5"
      >
        {/* 1. Official Red Header with Dog-Ear Corner */}
        <div
          className="relative flex h-14 w-full items-center justify-center bg-[#E1232E]"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)',
          }}
        >
          {/* Centered KHQR Logo */}
          <div className="flex items-center justify-center gap-1.5 select-none">
            <svg
              viewBox="0 0 24 24"
              className="size-5 shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="24" height="24" rx="5" fill="white" />
              <path
                d="M7 12C7 9.239 9.239 7 12 7C14.761 7 17 9.239 17 12C17 14.761 14.761 17 12 17"
                stroke="#E1232E"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="2" fill="#E1232E" />
            </svg>
            <span className="text-xl font-black tracking-wider text-white">
              KHQR
            </span>
          </div>

          {/* Folded Top-Right Corner (Dog-Ear) */}
          <svg
            className="pointer-events-none absolute right-0 top-0 size-[22px]"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* The folded flap */}
            <polygon points="0,0 0,22 22,22" fill="#9E1018" />
            <line
              x1="0"
              y1="0"
              x2="22"
              y2="22"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="0.75"
            />
          </svg>
        </div>

        {/* 2. Merchant Info Section */}
        <div className="p-4 text-left">
          <div className="truncate text-[14px] font-medium uppercase tracking-wide text-gray-700">
            {merchantName}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[24px] font-bold leading-tight tracking-tight text-gray-900">
              {formatAmount(amount, currency)}
            </span>
            <span className="text-[14px] font-semibold text-gray-400">
              {currency}
            </span>
          </div>
        </div>

        {/* 3. Dotted Divider with Side Notches */}
        <div className="relative my-0.5 flex w-full items-center">
          {/* Left Notch */}
          <div
            className="absolute -left-3 size-6 rounded-full bg-canvas shadow-inner"
            aria-hidden="true"
          />
          {/* Dotted Line */}
          <div className="mx-5 w-full border-t-2 border-dashed border-gray-200" />
          {/* Right Notch */}
          <div
            className="absolute -right-3 size-6 rounded-full bg-canvas shadow-inner"
            aria-hidden="true"
          />
        </div>

        {/* 4. QR Code Container (Square, Aspect Ratio 1:1, Crisp Vector) */}
        <div className="p-4 pt-2">
          <div className="relative mx-auto flex aspect-square w-full max-w-[256px] items-center justify-center rounded-2xl bg-white p-2">
            <QRCodeSVG
              value={qrData}
              size={240}
              level="H"
              includeMargin={true}
              className="khqr-vector-svg aspect-square size-full max-w-full"
            />

            {/* Center Currency Badge with White Protective Ring (Max 15% width) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-white p-0.5 shadow-xs ring-2 ring-white">
                <div className="flex size-full items-center justify-center rounded-full bg-[#E1232E] text-xs font-bold text-white select-none">
                  {currency === 'KHR' ? '៛' : '$'}
                </div>
              </div>
            </div>

            {/* Expired Overlay */}
            {isExpired ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/85 backdrop-blur-[2px]">
                <span className="rounded-full bg-red-100 px-3.5 py-1 text-xs font-bold tracking-wide text-red-700 ring-1 ring-red-200">
                  EXPIRED
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. Save QR Button */}
      <button
        type="button"
        onClick={() => void handleSaveQr()}
        disabled={downloading || isExpired}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {downloading ? 'Saving…' : 'Save QR'}
      </button>
    </div>
  )
}

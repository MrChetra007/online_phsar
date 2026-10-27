import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicSettings } from '../api/admin'
import { ArrowRightIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" />
    </svg>
  )
}

export function ContactPage() {
  const { language } = useI18n()
  const isKhmer = language === 'km'

  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getPublicSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false))
  }, [])

  const phone = settings?.['shop_contact_phone'] || ''
  const facebookUrl = settings?.['shop_facebook_url'] || ''
  const telegramUsername = settings?.['shop_telegram_username'] || ''

  const hasContact = phone || facebookUrl || telegramUsername

  return (
    <section className="mx-auto max-w-2xl py-4 sm:py-8">
      {/* Breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
      >
        <ArrowRightIcon className="size-4 rotate-180" />
        {isKhmer ? 'ត្រឡប់ទៅទំព័រដើម' : 'Back to home'}
      </Link>

      {/* Header */}
      <div className="mt-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
          <PhoneIcon className="size-4 text-emerald-700" />
          <span>{isKhmer ? 'ជំនួយ និងទំនាក់ទំនង' : 'Support & Contact'}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {isKhmer ? 'ទំនាក់ទំនងយើងខ្ញុំ' : 'Contact Us'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {isKhmer
            ? 'មានសំណួរ ឬបញ្ហា? ទំនាក់ទំនងក្រុមការងាររបស់យើងខ្ញុំ។'
            : 'Have a question, refund request, or need help with your order? Reach out to us.'}
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {/* Platform contact */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-bold text-slate-900">
            {isKhmer ? 'ទំនាក់ទំនងប្រព័ន្ធ onlinePhsar' : 'onlinePhsar Platform Support'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {isKhmer
              ? 'សម្រាប់បញ្ហាទូទៅ ការសង្ស័យអំពីការទូទាត់ ឬការសើរើបណ្ដឹង'
              : 'For general platform issues, payment disputes, or escalation requests.'}
          </p>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-10 animate-pulse rounded-full bg-slate-100" />
              <div className="h-10 animate-pulse rounded-full bg-slate-100" />
            </div>
          ) : hasContact ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  <PhoneIcon className="size-4" />
                  {phone}
                </a>
              ) : null}
              {facebookUrl ? (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {isKhmer ? 'Facebook' : 'Facebook Page'}
                </a>
              ) : null}
              {telegramUsername ? (
                <a
                  href={`https://t.me/${telegramUsername.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-slate-400">
              {isKhmer
                ? 'ព័ត៌មានទំនាក់ទំនងមិនទាន់ត្រូវបានបន្ថែមនៅឡើយ។'
                : 'Contact information has not been configured yet.'}
            </p>
          )}
        </div>

        {/* Store-level help */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-bold text-slate-900">
            {isKhmer ? 'ទំនាក់ទំនងហាង' : 'Contact a Store Directly'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {isKhmer
              ? 'សម្រាប់ការប្ដូរ ឬការសើរើ ឬការសង្ស័យអំពីទំនិញ សូមទំនាក់ទំនងហាងផ្ទាល់ ដែលលក់ទំនិញនោះ តាមរយៈប្រព័ន្ធ Facebook ឬ Telegram របស់ហាង ដែលបង្ហាញនៅលើទំព័រហាង។'
              : 'For refunds, returns, or product questions, contact the store that sold you the item directly. Each active store has a Facebook or Telegram link on their public store page.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {isKhmer ? 'រកមើលហាង' : 'Browse Stores'}
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50"
            >
              {isKhmer ? 'តាមដានការបញ្ជាទិញ' : 'Track My Order'}
            </Link>
          </div>
        </div>

        {/* Returns / Refunds info */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-bold text-slate-900">
            {isKhmer ? 'ការប្ដូរ និងការសង្ស័យ' : 'Returns & Refunds'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {isKhmer
              ? 'ប្រសិនបើទំនិញខូច ខុស ឬមិនត្រូវនឹងការបញ្ជា អ្នកមានសិទ្ធិស្នើសុំការប្ដូរ ឬការសង្ស័យក្នុងរយៈពេលដែលកំណត់ក្នុងលក្ខខណ្ឌប្រើប្រាស់ ។ ជំហានទី ១: ទំនាក់ទំនងហាង → ជំហានទី ២: ប្រសិនបើមិនដោះស្រាយ ទំនាក់ទំនងប្រព័ន្ធ onlinePhsar ។'
              : 'If you received a damaged, wrong, or missing item, you may request a return or refund within the window specified in our Terms of Service. Step 1: Contact the store → Step 2: If unresolved, escalate to onlinePhsar support.'}
          </p>
          <Link
            to="/terms"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
          >
            {isKhmer ? 'អានលក្ខខណ្ឌប្រើប្រាស់' : 'Read Terms of Service'}
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

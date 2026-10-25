import { useI18n } from '../lib/i18n'
import type { Language } from '../lib/i18n'

const languages: Language[] = ['km', 'en']

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm"
    >
      {languages.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          aria-pressed={language === value}
          className={[
            'rounded-md px-2.5 py-1 transition-colors',
            language === value
              ? 'bg-emerald-600 font-medium text-white'
              : 'text-slate-600 hover:bg-slate-100',
          ].join(' ')}
        >
          {t(value === 'km' ? 'lang.km' : 'lang.en')}
        </button>
      ))}
    </div>
  )
}

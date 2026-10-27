import { useI18n } from '../lib/i18n'
import type { Language } from '../lib/i18n'

const languages: Language[] = ['km', 'en']

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className="inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-sm shadow-sm"
    >
      {languages.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          aria-pressed={language === value}
          className={[
            'rounded-full px-2.5 py-1 transition-colors',
            language === value
              ? 'bg-emerald-700 font-medium text-white'
              : 'text-slate-600 hover:bg-stone-100',
          ].join(' ')}
        >
          {t(value === 'km' ? 'lang.km' : 'lang.en')}
        </button>
      ))}
    </div>
  )
}

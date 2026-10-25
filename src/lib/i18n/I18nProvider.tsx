import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { I18nContext, type Language } from './context'
import { en, km, type TranslationKey } from './translations'

const STORAGE_KEY = 'kos.language'
const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  km,
  en,
}

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'km'
  } catch {
    return 'km'
  }
}

function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    return
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    storeLanguage(language)
  }, [language])

  const t = useCallback(
    (key: TranslationKey) => dictionaries[language][key],
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

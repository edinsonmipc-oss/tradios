'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Locale = 'en' | 'es'
type TranslationValue = string | { [key: string]: TranslationValue }

let translationsCache: Record<Locale, Record<string, TranslationValue>> = {
  en: {},
  es: {},
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'es',
  setLocale: () => {},
  t: (key: string, fallback?: string) => fallback || key,
})

const STORAGE_KEY = 'sitepilot-locale'

function getNestedValue(obj: TranslationValue, path: string[]): string | undefined {
  let current: TranslationValue = obj
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, TranslationValue>)[key]
  }
  return typeof current === 'string' ? current : undefined
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es')
  const [loaded, setLoaded] = useState(false)

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const [enMod, esMod] = await Promise.all([
          import('@/i18n/en.json'),
          import('@/i18n/es.json'),
        ])
        translationsCache.en = enMod.default || enMod
        translationsCache.es = esMod.default || esMod
      } catch (e) {
        console.warn('Failed to load translations:', e)
      }
      setLoaded(true)
    }

    // Try to load saved locale
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved === 'en' || saved === 'es') {
        setLocaleState(saved)
      } else {
        // Auto-detect browser language
        const browserLang = navigator.language?.split('-')[0]
        if (browserLang === 'en') {
          setLocaleState('en')
        }
      }
    }

    loadTranslations()
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale)
    }
  }, [])

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const keys = key.split('.')
      const translations = translationsCache[locale]

      if (!translations) return fallback || key

      const value = getNestedValue(translations, keys)
      if (value !== undefined) return value

      // Fallback to English
      if (locale !== 'en') {
        const enValue = getNestedValue(translationsCache.en, keys)
        if (enValue !== undefined) return enValue
      }

      return fallback || key
    },
    [locale]
  )

  // Wait for translations to load before rendering children
  if (!loaded) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted">Loading...</div>
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

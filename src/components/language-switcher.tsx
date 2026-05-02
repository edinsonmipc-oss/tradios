'use client'

import { useI18n } from '@/lib/i18n'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  const toggleLocale = () => {
    setLocale(locale === 'es' ? 'en' : 'es')
  }

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
      title={t('language.switchTo')}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{locale === 'es' ? 'EN' : 'ES'}</span>
    </button>
  )
}

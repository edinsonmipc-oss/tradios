'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { I18nProvider } from '@/lib/i18n'
import LanguageSwitcher from '@/components/language-switcher'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <I18nProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </I18nProvider>
  )
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, logo_url')
        .eq('id', user.id)
        .single()
      if (profile) {
        if (profile.business_name) setBusinessName(profile.business_name)
        if (profile.logo_url) setLogoUrl(profile.logo_url)
      }
    }
    fetchProfile()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-card-hover transition-colors lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity lg:hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName || 'Logo'} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-white">{(businessName || 'Tradios')[0]}</span>
              </div>
            )}
            <span className="text-base font-bold text-foreground">{businessName || 'Tradios'}</span>
          </a>
          {/* Home button */}
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-card-hover transition-colors"
            title="Inicio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="hidden xs:inline">Inicio</span>
          </a>
          <LanguageSwitcher />
          {/* Spacer */}
          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

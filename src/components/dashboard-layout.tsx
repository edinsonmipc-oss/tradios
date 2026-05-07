'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu, Home } from 'lucide-react'
import dynamic from 'next/dynamic'

const AIAssistant = dynamic(() => import('@/components/ai-assistant'), { ssr: false })
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
    <div className="flex min-h-screen bg-[#0a0f1c] overflow-x-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 lg:ml-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#1e293b] bg-[#131c31] px-3 py-2.5 lg:px-4 lg:py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a2744] transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Home button - always visible */}
          <a
            href="/pipeline"
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors px-2.5 py-1.5 text-sm font-medium text-primary"
            title="Home - Pipeline"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </a>
          <div className="h-5 w-px bg-[#1e293b] mx-1" />
          <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName || 'Logo'} className="h-6 w-6 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 shrink-0">
                <span className="text-xs font-bold text-white">{(businessName || 'T')[0]}</span>
              </div>
            )}
            <span className="text-sm font-bold text-[#f1f5f9] truncate">{businessName || 'Tradios'}</span>
          </a>
          <div className="flex-1" />
          <LanguageSwitcher />
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-5 lg:p-6">
          {children}
        </main>
      </div>
      <AIAssistant />
    </div>
  )
}

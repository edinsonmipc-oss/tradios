'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/sidebar'
import { CommandPalette } from '@/components/command-palette'
import {
  Menu, Home, LayoutDashboard, Users, FileText, CalendarDays,
  Bell, ArrowLeft, ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { I18nProvider } from '@/lib/i18n'

const AIAssistant = dynamic(() => import('@/components/ai-assistant'), {
  ssr: false,
})

const mobileNavItems = [
  { href: '/pipeline', label: 'Pipeline', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
]

// Pages that are "detail" views where a back button makes sense
const detailRoutes = ['/clients', '/quotes', '/visits', '/jobs']

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/pipeline': 'Pipeline',
    '/dashboard': 'Dashboard',
    '/clients': 'Clients',
    '/quotes': 'Quotes',
    '/invoices': 'Invoices',
    '/calendar': 'Calendar',
    '/payments': 'Payments',
    '/expenses': 'Expenses',
    '/inventory': 'Inventory',
    '/insurance': 'Insurance',
    '/gallery': 'Gallery',
    '/messages': 'Messages',
    '/follow-ups': 'Follow-ups',
    '/ai-tools': 'AI Tools',
    '/settings': 'Settings',
  }
  return titles[pathname] || 'Tradios'
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [businessName, setBusinessName] = useState('Tradios')
  const pathname = usePathname()
  const router = useRouter()

  // Determine if we're on a detail/sub-page (has an ID segment)
  const pathSegments = pathname.split('/').filter(Boolean)
  const isDetailPage = pathSegments.length >= 3
  const isSubPage = pathSegments.length >= 2 && !['pipeline', 'dashboard', 'clients', 'quotes', 'invoices', 'calendar', 'payments', 'expenses', 'inventory', 'insurance', 'gallery', 'messages', 'follow-ups', 'ai-tools', 'settings'].includes(pathSegments[pathSegments.length - 1])
  const showBack = isDetailPage || isSubPage

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        supabase
          .from('profiles')
          .select('business_name, full_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.business_name) setBusinessName(data.business_name)
            else if (data?.full_name) setBusinessName(data.full_name)
            else setBusinessName(user.email!.split('@')[0])
          })
      }
    })
  }, [])

  // CMD+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdkOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setCmdkOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const handleOpen = () => setCmdkOpen(true)
    window.addEventListener('open-cmdk', handleOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-cmdk', handleOpen)
    }
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-[240px] min-h-screen">
        {/* Top bar (mobile only) */}
        <header className="sticky top-0 z-30 md:hidden flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-icon"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn btn-ghost btn-icon"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white font-bold text-xs">
              T
            </div>
            <span className="font-semibold text-sm">{businessName}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className="btn btn-ghost btn-icon" aria-label="Home">
              <Home size={18} />
            </Link>
            <button className="btn btn-ghost btn-icon" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 md:px-0">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('mobile-nav-item', active && 'active')}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Command Palette */}
      {cmdkOpen && <CommandPalette onClose={() => setCmdkOpen(false)} />}

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  )
}

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

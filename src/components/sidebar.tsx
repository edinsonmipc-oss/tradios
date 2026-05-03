'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Image,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Receipt,
  TrendingUp,
  Shield,
  Bell,
  DollarSign,
  Package,
  CalendarDays,
  FileSpreadsheet,
  MessageCircle,
  ClipboardList,
  Repeat,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/language-switcher'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', i18nKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', i18nKey: 'nav.clients', icon: Users },
  { href: '/quotes', label: 'Quotes', i18nKey: 'nav.quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', i18nKey: 'nav.invoices', icon: FileSpreadsheet },
  { href: '/payments', label: 'Payments', i18nKey: 'nav.payments', icon: DollarSign },
  { href: '/visits', label: 'Visits', i18nKey: 'nav.visits', icon: Calendar },
  { href: '/calendar', label: 'Calendar', i18nKey: 'nav.calendar', icon: CalendarDays },
  { href: '/client-message', label: 'Client Messages', i18nKey: 'nav.clientMessages', icon: MessageCircle },
  { href: '/quote-builder', label: 'Quote Builder', i18nKey: 'nav.quoteBuilder', icon: ClipboardList },
  { href: '/follow-ups', label: 'Follow-Ups', i18nKey: 'nav.followUps', icon: Bell },
  { href: '/follow-up-system', label: 'Follow-Up System', i18nKey: 'nav.followUpSystem', icon: Repeat },
  { href: '/expenses', label: 'Expenses', i18nKey: 'nav.expenses', icon: Receipt },
  { href: '/inventory', label: 'Inventory', i18nKey: 'nav.inventory', icon: Package },
  { href: '/accounting', label: 'Accounting', i18nKey: 'nav.accounting', icon: TrendingUp },
  { href: '/insurance', label: 'Insurance', i18nKey: 'nav.insurance', icon: Shield },
  { href: '/gallery', label: 'Gallery', i18nKey: 'nav.gallery', icon: Image },
  { href: '/messages', label: 'Messages', i18nKey: 'nav.messages', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', i18nKey: 'nav.settings', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t, locale } = useI18n()
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on ESC
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) onClose()
  }, [open, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Close on route change (mobile)
  useEffect(() => {
    // Use pathname to close on mobile after nav
    if (open && window.innerWidth < 1024) {
      onClose()
    }
  }, [pathname])

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success(t('nav.signOut') + ' ✓')
    router.push('/auth/login')
  }

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-card border-r border-border transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto',
          'w-[82vw] max-w-[320px] min-w-[280px]',
          'pb-safe',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + Close */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
            {logoUrl ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shrink-0">
                <img src={logoUrl} alt={businessName || 'Logo'} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 shrink-0">
                <span className="text-sm font-bold text-white">T</span>
              </div>
            )}
            <span className="text-sm font-bold text-foreground truncate">
              {businessName || 'Tradios'}
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-card-hover transition-colors lg:hidden shrink-0"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-teal-500/15 text-teal-400 border-l-[3px] border-l-teal-500 -ml-px'
                    : 'text-muted hover:text-foreground hover:bg-card-hover border-l-[3px] border-l-transparent -ml-px'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{t(item.i18nKey)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Language + Sign Out */}
        <div className="border-t border-border px-2 py-2 space-y-1 shrink-0">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {t('nav.signOut')}
          </button>
          <div className="flex items-center justify-between px-1 py-1">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>
    </>
  )
}

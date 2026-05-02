'use client'

import { useState, useEffect } from 'react'
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
  { href: '/follow-ups', label: 'Follow-Ups', i18nKey: 'nav.followUps', icon: Bell },
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            {logoUrl ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
                <img src={logoUrl} alt={businessName || 'Logo'} className="h-8 w-8 object-cover" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                <span className="text-sm font-bold text-white">T</span>
              </div>
            )}
            <span className="text-lg font-bold text-foreground">
              {businessName || 'Tradios'}
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-card-hover transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border-l-2 border-l-primary'
                    : 'text-muted hover:text-foreground hover:bg-card-hover border-l-2 border-l-transparent'
                )}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                {t(item.i18nKey)}
              </Link>
            )
          })}
        </nav>

        {/* Language + Sign Out */}
        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-all duration-200"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            {t('nav.signOut')}
          </button>
          <div className="flex items-center justify-between px-3 py-1">
            <LanguageSwitcher />
            <span className="text-xs text-muted/50">{t('language.' + (locale === 'es' ? 'en' : 'es'))}</span>
          </div>
        </div>
      </aside>
    </>
  )
}

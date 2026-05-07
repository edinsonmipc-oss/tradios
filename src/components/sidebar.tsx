'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  Image,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Receipt,
  Bell,
  DollarSign,
  ClipboardList,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/language-switcher'

const navItems = [
  // Main
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: ClipboardList },
  { href: '/visits', label: 'Visits', icon: CalendarDays },
  { href: '/payments', label: 'Payments', icon: DollarSign },
  // Operations
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/follow-ups', label: 'Follow-ups', icon: Bell },
  { href: '/gallery', label: 'Gallery', icon: Image },
  // Account
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out')
      router.push('/auth/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const fetchProfile = useCallback(async () => {
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
  }, [supabase])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-white">T</span>
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-foreground">{businessName || 'Tradios'}</div>
              <div className="text-[10px] text-muted">Tradie OS</div>
            </div>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-muted/20 hover:text-foreground lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted hover:bg-muted/20 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

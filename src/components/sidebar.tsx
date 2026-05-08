'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  CalendarDays,
  Sparkles,
  Zap,
  Wallet,
  Settings,
  LogOut,
  X,
  Bell,
  Image,
  MessageSquare,
  Shield,
  Receipt,
  Package,
  HelpCircle,
  ChevronRight,
  Search,
  Home,
  ClipboardList,
} from 'lucide-react'

const navSections = [
  {
    title: 'Workspace',
    items: [
      { href: '/pipeline', label: 'Pipeline', icon: Home },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/clients', label: 'Clients', icon: Users },
    ],
  },
  {
    title: 'Work',
    items: [
      { href: '/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/quotes', label: 'Quotes', icon: FileText },
      { href: '/invoices', label: 'Invoices', icon: ClipboardList },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/payments', label: 'Payments', icon: Wallet },
      { href: '/expenses', label: 'Expenses', icon: Receipt },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/insurance', label: 'Insurance', icon: Shield },
      { href: '/gallery', label: 'Gallery', icon: Image },
    ],
  },
  {
    title: 'AI & Tools',
    items: [
      { href: '/ai-tools', label: 'AI Tools', icon: Sparkles },
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/follow-ups', label: 'Follow-ups', icon: Bell },
    ],
  },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        supabase
          .from('profiles')
          .select('full_name, business_name')
          .eq('id', data.user.id)
          .single()
          .then(({ data: prof }) => setProfile(prof))
      }
    })
  }, [])

  const displayName =
    profile?.business_name ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'User'

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    toast.success('Signed out')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="sidebar flex flex-col h-full">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">T</div>
        <div>
          <div className="sidebar-brand">Tradios</div>
          <div className="text-[11px] text-fg-tertiary mt-[-2px]">
            Trade Business OS
          </div>
        </div>
      </div>

      {/* Search */}
      <div
        className="sidebar-search"
        onClick={() => {
          const event = new CustomEvent('open-cmdk')
          window.dispatchEvent(event)
          onClose()
        }}
      >
        <Search size={14} />
        <span>Search Tradios...</span>
        <kbd>⌘K</kbd>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'sidebar-item',
                    isActive(item.href) && 'active'
                  )}
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="sidebar-user-name truncate">{displayName}</div>
            <div className="sidebar-user-email truncate">
              {user?.email || ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] md:hidden transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}

'use client'

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

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: FileSpreadsheet },
  { href: '/payments', label: 'Payments', icon: DollarSign },
  { href: '/visits', label: 'Visits', icon: Calendar },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/follow-ups', label: 'Follow-Ups', icon: Bell },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/accounting', label: 'Accounting', icon: TrendingUp },
  { href: '/insurance', label: 'Insurance', icon: Shield },
  { href: '/gallery', label: 'Gallery', icon: Image },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold text-foreground">Tradios</span>
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
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-border p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-all duration-200"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  CalendarDays,
  Wallet,
  Receipt,
  Package,
  Shield,
  Image,
  MessageSquare,
  Bell,
  Sparkles,
  Settings,
  Home,
  ClipboardList,
} from 'lucide-react'

const pages = [
  { href: '/pipeline', label: 'Pipeline', icon: Home, desc: 'Job pipeline & kanban board' },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Business overview & metrics' },
  { href: '/clients', label: 'Clients', icon: Users, desc: 'Manage your clients' },
  { href: '/jobs', label: 'Jobs', icon: Briefcase, desc: 'Active & completed jobs' },
  { href: '/quotes', label: 'Quotes', icon: FileText, desc: 'Create & manage quotes' },
  { href: '/invoices', label: 'Invoices', icon: ClipboardList, desc: 'Invoice management' },
  { href: '/payments', label: 'Payments', icon: Wallet, desc: 'Track payments received' },
  { href: '/expenses', label: 'Expenses', icon: Receipt, desc: 'Track business expenses' },
  { href: '/inventory', label: 'Inventory', icon: Package, desc: 'Manage stock & materials' },
  { href: '/insurance', label: 'Insurance', icon: Shield, desc: 'Insurance policies & renewals' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, desc: 'Schedule & appointments' },
  { href: '/gallery', label: 'Gallery', icon: Image, desc: 'Before & after photos' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, desc: 'Client communications' },
  { href: '/follow-ups', label: 'Follow-ups', icon: Bell, desc: 'Client follow-up reminders' },
  { href: '/ai-tools', label: 'AI Tools', icon: Sparkles, desc: 'AI-powered business tools' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, desc: 'Account & app settings' },
]

const actions = [
  { label: 'New Quote', icon: FileText, desc: 'Create a new quote', action: '/quotes/new' },
  { label: 'New Client', icon: Users, desc: 'Add a new client', action: '/clients/new' },
  { label: 'Schedule Visit', icon: CalendarDays, desc: 'Schedule a site visit', action: '/visits/new' },
  { label: 'New Job', icon: Briefcase, desc: 'Create a new job', action: '/jobs/new' },
]

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const allItems = [
    ...actions.map((a) => ({ ...a, type: 'action' as const })),
    ...pages.map((p) => ({ ...p, type: 'page' as const })),
  ]

  const filtered = allItems.filter((item) => {
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = useCallback(
    (item: (typeof filtered)[0]) => {
      onClose()
      if ('action' in item) {
        router.push(item.action)
      } else {
        router.push(item.href)
      }
    },
    [router, onClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex])
    }
  }

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-modal" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="cmdk-input-wrap">
          <Search size={20} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search pages, actions, clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd
            className="text-[11px] px-2 py-1 rounded bg-bg-tertiary text-fg-quaternary font-mono cursor-pointer"
            onClick={onClose}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="cmdk-results">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-fg-tertiary">
              <Search size={24} className="mb-3 opacity-40" />
              <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <>
              {/* Actions */}
              {filtered.filter((i) => i.type === 'action').length > 0 && (
                <>
                  <div className="cmdk-group-label">Quick Actions</div>
                  {filtered
                    .filter((i) => i.type === 'action')
                    .map((item, idx) => {
                      const actualIdx = filtered.indexOf(item)
                      const Icon = item.icon
                      return (
                        <div
                          key={item.label}
                          className={`cmdk-item ${actualIdx === selectedIndex ? 'selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(actualIdx)}
                        >
                          <div className="cmdk-item-icon">
                            <Icon size={18} />
                          </div>
                          <div className="cmdk-item-text">
                            <div className="cmdk-item-title">{item.label}</div>
                            <div className="cmdk-item-desc">{item.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                </>
              )}

              {/* Pages */}
              {filtered.filter((i) => i.type === 'page').length > 0 && (
                <>
                  <div className="cmdk-group-label">Pages</div>
                  {filtered
                    .filter((i) => i.type === 'page')
                    .map((item) => {
                      const actualIdx = filtered.indexOf(item)
                      const Icon = item.icon
                      return (
                        <div
                          key={item.href}
                          className={`cmdk-item ${actualIdx === selectedIndex ? 'selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(actualIdx)}
                        >
                          <div className="cmdk-item-icon">
                            <Icon size={18} />
                          </div>
                          <div className="cmdk-item-text">
                            <div className="cmdk-item-title">{item.label}</div>
                            <div className="cmdk-item-desc">{item.desc}</div>
                          </div>
                          <div className="cmdk-shortcuts">
                            <kbd>↵</kbd>
                          </div>
                        </div>
                      )
                    })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

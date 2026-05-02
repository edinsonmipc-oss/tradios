'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-card-hover transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-white">T</span>
            </div>
            <span className="text-base font-bold text-foreground">Tradios</span>
          </a>
          {/* Spacer */}
          <div className="flex-1" />
          {/* Home button always visible on mobile */}
          <a
            href="/dashboard"
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-card-hover transition-colors"
            title="Go to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </a>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

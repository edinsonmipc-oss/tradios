'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Search, Plus, FileText } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Quote } from '@/lib/utils'

const statusFilters = ['all', 'draft', 'sent', 'accepted', 'declined'] as const
type StatusFilter = (typeof statusFilters)[number]

export default function QuotesPage() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const fetchQuotes = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('quotes')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (search.trim()) {
      query = query.or(
        `quote_number.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%`
      )
    }

    const { data } = await query
    if (data) setQuotes(data as unknown as Quote[])
    setLoading(false)
  }

  useEffect(() => {
    fetchQuotes()
  }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="mt-1 text-sm text-muted">Create and manage quotes</p>
        </div>
        <Link href="/quotes/new">
          <Button>
            <Plus className="h-4 w-4" /> New Quote
          </Button>
        </Link>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search quote # or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchQuotes() }}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground hover:bg-card'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Quote #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden sm:table-cell">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">Loading...</td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted/50" />
                    <p>No quotes found</p>
                  </div>
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
                <tr key={quote.id} className="transition-colors hover:bg-card-hover">
                  <td className="px-4 py-3">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {quote.clients?.name || 'Unknown'}
                  </td>
                  <td className="hidden px-4 py-3 text-sm font-semibold text-foreground sm:table-cell">
                    {formatCurrency(quote.total)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted md:table-cell">
                    {formatDate(quote.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(quote.status)}>
                      {quote.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/quotes/${quote.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

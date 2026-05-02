import { createServerSupabaseClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const userEmail = user.email || ''

  // Fetch business name from profiles or settings
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()

  const businessName = profile?.business_name || profile?.full_name || userEmail.split('@')[0]

  // Fetch stats
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: activeQuotes } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['draft', 'sent'])

  const today = new Date().toISOString().split('T')[0]
  const { count: visitsToday } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('scheduled_date', today)
    .lte('scheduled_date', today + 'T23:59:59.999Z')

  const { data: allQuotes } = await supabase
    .from('quotes')
    .select('status')
    .eq('user_id', user.id)

  const totalQuotes = allQuotes?.length || 0
  const acceptedQuotes = allQuotes?.filter(q => q.status === 'accepted').length || 0
  const wonRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0

  // Fetch recent quotes
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('*, clients(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch upcoming visits
  const { data: upcomingVisits } = await supabase
    .from('visits')
    .select('*, clients(name)')
    .eq('user_id', user.id)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(5)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {businessName}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Here&apos;s your business overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Clients"
          value={totalClients ?? 0}
          trend={{ value: 'active clients', direction: 'up' }}
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Active Quotes"
          value={activeQuotes ?? 0}
          trend={{ value: `${totalQuotes} total`, direction: 'up' }}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Visits Today"
          value={visitsToday ?? 0}
          trend={{ value: 'scheduled', direction: 'up' }}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Won Rate"
          value={`${wonRate}%`}
          trend={{ value: 'accepted/total', direction: wonRate >= 50 ? 'up' : 'down' }}
        />
      </div>

      {/* Recent Quotes & Upcoming Visits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Quotes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Quotes</h2>
            <Link href="/quotes">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {recentQuotes && recentQuotes.length > 0 ? (
            <div className="space-y-3">
              {recentQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-card-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {quote.title || quote.quote_number}
                    </p>
                    <p className="text-xs text-muted">
                      {quote.clients?.name || 'Unknown'} • {formatDate(quote.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(quote.total)}
                    </span>
                    <Badge variant={statusBadgeVariant(quote.status)}>
                      {quote.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No quotes yet</p>
          )}
        </div>

        {/* Upcoming Visits */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Upcoming Visits</h2>
            <Link href="/visits">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {upcomingVisits && upcomingVisits.length > 0 ? (
            <div className="space-y-3">
              {upcomingVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/visits/${visit.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-card-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {visit.clients?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted">
                      {visit.scheduled_date ? formatDate(visit.scheduled_date) : 'No date set'}
                      {visit.address ? ` • ${visit.address}` : ''}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(visit.status)}>
                    {visit.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No upcoming visits</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/clients">
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4" /> New Client
            </Button>
          </Link>
          <Link href="/quotes/new">
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4" /> New Quote
            </Button>
          </Link>
          <Link href="/visits">
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4" /> Schedule Visit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

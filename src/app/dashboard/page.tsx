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
  Bell,
  Shield,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const userEmail = user.email || ''

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()

  const businessName = profile?.business_name || profile?.full_name || userEmail.split('@')[0]

  // Stats
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
  const { count: visitsScheduled } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('scheduled_date', today)
    .limit(50)

  const { data: allQuotes } = await supabase
    .from('quotes')
    .select('status, total')
    .eq('user_id', user.id)

  const totalQuotes = allQuotes?.length || 0
  const acceptedQuotes = allQuotes?.filter(q => q.status === 'accepted').length || 0
  const wonRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0
  const totalRevenue = allQuotes?.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.total || 0), 0) || 0

  // Follow-ups stats
  const { count: pendingFollowUps } = await supabase
    .from('follow_ups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .lt('due_date', today)

  const { count: dueTodayFollowUps } = await supabase
    .from('follow_ups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .eq('due_date', today)

  // Insurance stats
  const { data: insurances } = await supabase
    .from('insurances')
    .select('expiry_date, status, renewal_cost, premium_amount')
    .eq('user_id', user.id)
    .in('status', ['active'])

  const expiringInsurances = insurances?.filter(i => {
    if (!i.expiry_date) return false
    const daysLeft = Math.ceil((new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 30
  }).length || 0

  const annualInsuranceCost = insurances?.reduce((sum, i) => sum + (i.renewal_cost || i.premium_amount || 0), 0) || 0

  // Recent quotes
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('*, clients(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Upcoming visits
  const { data: upcomingVisits } = await supabase
    .from('visits')
    .select('*, clients(name)')
    .eq('user_id', user.id)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(5)

  // Urgent follow-ups
  const { data: urgentFollowUps } = await supabase
    .from('follow_ups')
    .select('*, clients(name)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(3)

  // Expiring insurances
  const { data: expiringInsuranceList } = await supabase
    .from('insurances')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active'])
    .order('expiry_date', { ascending: true })
    .limit(3)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-card-border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-secondary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🇦🇺</span>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              G&apos;day, {businessName}
            </h1>
          </div>
          <p className="text-foreground-secondary mt-1">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/clients">
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Client
              </Button>
            </Link>
            <Link href="/quotes/new">
              <Button variant="gold" size="sm">
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

      {/* Alert Cards - urgent items */}
      {(pendingFollowUps ?? 0) > 0 || expiringInsurances > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(pendingFollowUps ?? 0) > 0 && (
            <Link href="/follow-ups" className="group">
              <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 transition-all duration-300 hover:bg-red-500/10 hover:border-red-500/50 card-glow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400">{pendingFollowUps} overdue follow-up{pendingFollowUps !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-400/70">Needs your attention →</p>
                </div>
              </div>
            </Link>
          )}
          {expiringInsurances > 0 && (
            <Link href="/insurance" className="group">
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-500/50 card-glow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-400">{expiringInsurances} insurance{expiringInsurances !== 1 ? 's' : ''} expiring soon</p>
                  <p className="text-xs text-amber-400/70">Renew before it&apos;s too late →</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      ) : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Clients"
          value={totalClients ?? 0}
          trend={{ value: 'active', direction: 'up' }}
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Active Quotes"
          value={activeQuotes ?? 0}
          trend={{ value: `${totalQuotes} total`, direction: 'up' }}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Upcoming Visits"
          value={visitsScheduled ?? 0}
          trend={{ value: 'scheduled', direction: activeQuotes !== null && visitsScheduled !== null && activeQuotes < visitsScheduled ? 'down' : 'up' }}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Won Rate"
          value={`${wonRate}%`}
          trend={{ value: acceptedQuotes > 0 ? `${acceptedQuotes} won` : 'no data', direction: wonRate >= 50 ? 'up' : 'down' }}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Bell className="h-5 w-5" />}
          label="Pending Follow-ups"
          value={pendingFollowUps ?? 0}
          className={(pendingFollowUps ?? 0) > 0 ? 'border-red-500/30' : ''}
          trend={{ value: 'overdue', direction: (pendingFollowUps ?? 0) > 0 ? 'down' : 'up' }}
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="Insurances Active"
          value={insurances?.length || 0}
          className={expiringInsurances > 0 ? 'border-amber-500/30' : ''}
          trend={{ value: `${annualInsuranceCost > 0 ? '$' + Math.round(annualInsuranceCost / (insurances?.length || 1)).toLocaleString() + '/yr' : 'no data'}`, direction: 'up' }}
        />
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          label="Quotes Total"
          value={totalQuotes}
          trend={{ value: `${totalRevenue > 0 ? formatCurrency(totalRevenue) + ' won' : 'no revenue'}`, direction: totalRevenue > 0 ? 'up' : 'down' }}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Annual Insurance"
          value={annualInsuranceCost > 0 ? formatCurrency(annualInsuranceCost) : '$0'}
          className={annualInsuranceCost > 0 ? 'border-primary/20' : ''}
          trend={{ value: 'total/year', direction: 'up' }}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotes */}
        <div className="lg:col-span-2 rounded-xl border border-card-border bg-card p-5 shadow-md card-glow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Recent Quotes
            </h2>
            <Link href="/quotes">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {recentQuotes && recentQuotes.length > 0 ? (
            <div className="space-y-2">
              {recentQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="flex items-center justify-between rounded-xl border border-card-border bg-background/50 p-3.5 transition-all duration-200 hover:bg-card-hover hover:border-primary/30 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {quote.title || quote.quote_number}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {quote.clients?.name || 'Unknown'} • {formatDate(quote.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
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
            <div className="py-10 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted/30 mb-3" />
              <p className="text-sm text-muted">No quotes yet</p>
              <Link href="/quotes/new">
                <Button variant="ghost" size="sm" className="mt-2">
                  <Plus className="h-3.5 w-3.5" /> Create your first quote
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Urgent Items Sidebar */}
        <div className="space-y-4">
          {/* Urgent Follow-ups */}
          <div className="rounded-xl border border-card-border bg-card p-5 shadow-md card-glow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Urgent Follow-ups
              </h2>
              <Link href="/follow-ups">
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {urgentFollowUps && urgentFollowUps.length > 0 ? (
              <div className="space-y-2">
                {urgentFollowUps.slice(0, 3).map((fu) => (
                  <Link
                    key={fu.id}
                    href="/follow-ups"
                    className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 transition-all hover:bg-red-500/10"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{fu.title}</p>
                      <p className="text-xs text-muted truncate">{fu.clients?.name} • {formatDate(fu.due_date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-success/50 mb-2" />
                <p className="text-xs text-muted">All caught up! 🎉</p>
              </div>
            )}
          </div>

          {/* Insurance Renewals */}
          <div className="rounded-xl border border-card-border bg-card p-5 shadow-md card-glow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Insurance Renewals
              </h2>
              <Link href="/insurance">
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {expiringInsuranceList && expiringInsuranceList.filter(i => i.expiry_date).length > 0 ? (
              <div className="space-y-2">
                {expiringInsuranceList.filter(i => i.expiry_date).slice(0, 3).map((ins) => {
                  const daysLeft = Math.ceil((new Date(ins.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const isUrgent = daysLeft <= 15
                  return (
                    <Link
                      key={ins.id}
                      href="/insurance"
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                        isUrgent ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 'border-card-border bg-background/50 hover:bg-card-hover'
                      }`}
                    >
                      <Clock className={`h-4 w-4 flex-shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{ins.type}</p>
                        <p className="text-xs text-muted">
                          {daysLeft <= 0 ? 'OVERDUE' : `${daysLeft} days left`}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-amber-500'}`}>
                        {formatDate(ins.expiry_date!)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Shield className="h-8 w-8 mx-auto text-muted/30 mb-2" />
                <p className="text-xs text-muted">No insurances added yet</p>
                <Link href="/insurance">
                  <Button variant="ghost" size="sm" className="mt-1">
                    <Plus className="h-3 w-3" /> Add insurance
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Visits */}
      <div className="rounded-xl border border-card-border bg-card p-5 shadow-md card-glow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Visits
          </h2>
          <Link href="/visits">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        {upcomingVisits && upcomingVisits.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingVisits.map((visit) => (
              <Link
                key={visit.id}
                href={`/visits/${visit.id}`}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-background/50 p-3.5 transition-all duration-200 hover:bg-card-hover hover:border-primary/30 group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {visit.clients?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {visit.scheduled_date ? formatDate(visit.scheduled_date) : 'No date'}
                  </p>
                </div>
                {visit.address && (
                  <span className="text-xs text-muted hidden md:block truncate max-w-[100px]">{visit.address}</span>
                )}
                <Badge variant={statusBadgeVariant(visit.status)}>
                  {visit.status}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted/30 mb-3" />
            <p className="text-sm text-muted">No upcoming visits scheduled</p>
            <Link href="/visits">
              <Button variant="ghost" size="sm" className="mt-2">
                <Plus className="h-3.5 w-3.5" /> Schedule a visit
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

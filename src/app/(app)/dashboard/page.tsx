import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  TrendingUp, Users, FileText, CalendarDays,
  DollarSign, Clock, CheckCircle2, AlertTriangle,
  Bell, Shield, ArrowRight, Plus,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const userEmail = user.email || ''
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()

  const businessName = profile?.business_name || profile?.full_name || userEmail.split('@')[0]

  // Fetch stats
  const { count: totalClients } = await supabase
    .from('clients').select('*', { count: 'exact', head: true })

  const { count: activeQuotes } = await supabase
    .from('quotes').select('*', { count: 'exact', head: true })
    .in('status', ['draft', 'sent'])

  const { count: visitsScheduled } = await supabase
    .from('visits').select('*', { count: 'exact', head: true })
    .in('status', ['scheduled', 'pending'])

  const { count: totalQuotes } = await supabase
    .from('quotes').select('*', { count: 'exact', head: true })

  const { data: allQuotes } = await supabase
    .from('quotes').select('status, total_amount')
    .order('created_at', { ascending: false })

  const wonQuotes = allQuotes?.filter((q) => q.status === 'accepted') || []
  const wonRate = totalQuotes && totalQuotes > 0
    ? Math.round((wonQuotes.length / totalQuotes) * 100)
    : 0

  const totalRevenue = wonQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)

  // Follow-ups
  const { data: pendingFollowUps } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('completed', false)
    .order('due_date', { ascending: true })
    .limit(5)

  // Recent quotes
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Upcoming visits
  const { data: upcomingVisits } = await supabase
    .from('visits')
    .select('*, clients(name)')
    .in('status', ['scheduled', 'pending'])
    .order('scheduled_date', { ascending: true })
    .limit(4)

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Welcome back, {businessName.split(' ')[0]}
          </h1>
          <p className="page-subtitle">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <Link href="/quotes/new" className="btn btn-primary">
          <Plus size={16} />
          New Quote
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row mb-6">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon bg-accent-soft text-accent">
              <DollarSign size={20} />
            </div>
            <span className="text-xs text-fg-tertiary">This month</span>
          </div>
          <div className="stat-card-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-card-label">Total Revenue</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon bg-success-soft text-success">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-value">{totalClients || 0}</div>
          <div className="stat-card-label">Total Clients</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon bg-warning-soft text-warning">
              <FileText size={20} />
            </div>
          </div>
          <div className="stat-card-value">{activeQuotes || 0}</div>
          <div className="stat-card-label">Active Quotes</div>
          {wonRate > 0 && (
            <div className="stat-card-change up">↑ {wonRate}% won rate</div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon bg-info-soft text-info">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="stat-card-value">{visitsScheduled || 0}</div>
          <div className="stat-card-label">Scheduled Visits</div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="dashboard-grid">
        {/* Main Column */}
        <div className="dashboard-main">
          {/* Recent Quotes */}
          <div className="widget">
            <div className="widget-header">
              <span className="widget-title">Recent Quotes</span>
              <Link
                href="/quotes"
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="widget-body p-0">
              {recentQuotes && recentQuotes.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentQuotes.map((quote) => (
                    <Link
                      key={quote.id}
                      href={`/quotes/${quote.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-glass-hover transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-fg truncate">
                          {(quote.clients as any)?.name || 'Unknown Client'}
                        </div>
                        <div className="text-xs text-fg-tertiary mt-0.5">
                          {formatDate(quote.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-fg">
                          {formatCurrency(quote.total_amount || 0)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            quote.status === 'accepted'
                              ? 'bg-success-soft text-success'
                              : quote.status === 'declined'
                              ? 'bg-danger-soft text-danger'
                              : quote.status === 'sent'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-surface-hover text-fg-secondary'
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <FileText size={20} />
                  </div>
                  <div className="empty-state-title">No quotes yet</div>
                  <div className="empty-state-desc">
                    Create your first quote to get started
                  </div>
                  <Link href="/quotes/new" className="btn btn-primary btn-sm mt-2">
                    <Plus size={14} />
                    New Quote
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Visits */}
          <div className="widget">
            <div className="widget-header">
              <span className="widget-title">Upcoming Visits</span>
              <Link
                href="/visits"
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="widget-body p-0">
              {upcomingVisits && upcomingVisits.length > 0 ? (
                <div className="divide-y divide-border">
                  {upcomingVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-hover flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-fg">
                          {new Date(visit.scheduled_date).getDate()}
                        </span>
                        <span className="text-[10px] text-fg-tertiary -mt-0.5">
                          {new Date(visit.scheduled_date).toLocaleString('en-AU', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-fg truncate">
                          {(visit.clients as any)?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-fg-tertiary mt-0.5">
                          {visit.notes || 'Site visit'}
                        </div>
                      </div>
                      <span className="badge badge-warning">Scheduled</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <CalendarDays size={20} />
                  </div>
                  <div className="empty-state-title">No visits scheduled</div>
                  <div className="empty-state-desc">
                    Schedule your first site visit
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="dashboard-sidebar">
          {/* Pending Follow-ups */}
          <div className="widget">
            <div className="widget-header">
              <span className="widget-title">Follow-ups</span>
            </div>
            <div className="widget-body p-0">
              {pendingFollowUps && pendingFollowUps.length > 0 ? (
                <div className="divide-y divide-border">
                  {pendingFollowUps.slice(0, 3).map((fu) => (
                    <div key={fu.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-fg-secondary">
                            {fu.notes || 'Follow up'}
                          </div>
                          <div className="text-xs text-fg-quaternary mt-1">
                            Due {formatDate(fu.due_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state py-8">
                  <div className="text-xs text-fg-tertiary">
                    No pending follow-ups
                  </div>
                </div>
              )}
              <Link
                href="/follow-ups"
                className="block px-5 py-3 text-xs text-accent hover:text-accent-hover border-t border-border"
              >
                Manage follow-ups →
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="widget">
            <div className="widget-header">
              <span className="widget-title">Quick Actions</span>
            </div>
            <div className="widget-body flex flex-col gap-2">
              <Link
                href="/quotes/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-glass-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <span className="text-sm text-fg-secondary">New Quote</span>
              </Link>
              <Link
                href="/clients/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-glass-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-success-soft text-success flex items-center justify-center">
                  <Users size={16} />
                </div>
                <span className="text-sm text-fg-secondary">New Client</span>
              </Link>
              <Link
                href="/visits/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-glass-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-warning-soft text-warning flex items-center justify-center">
                  <CalendarDays size={16} />
                </div>
                <span className="text-sm text-fg-secondary">Schedule Visit</span>
              </Link>
              <Link
                href="/invoice/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-glass-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-info-soft text-info flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
                <span className="text-sm text-fg-secondary">New Invoice</span>
              </Link>
            </div>
          </div>

          {/* Won Rate */}
          <div className="widget">
            <div className="widget-header">
              <span className="widget-title">Performance</span>
            </div>
            <div className="widget-body">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-fg-secondary">Quote Win Rate</span>
                <span className="text-2xl font-bold text-fg">{wonRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-500"
                  style={{ width: `${wonRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-fg-quaternary">
                <span>{wonQuotes.length} won</span>
                <span>{(totalQuotes || 0) - wonQuotes.length} lost</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ClientPipeline from '@/components/client-pipeline'
import type { PipelineState } from '@/components/client-pipeline'
import Link from 'next/link'
import {
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  MessageSquare,
  Plus,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!client) notFound()

  // ── Fetch related data ──
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: visits } = await supabase
    .from('visits')
    .select('*')
    .eq('client_id', id)
    .order('scheduled_date', { ascending: false })

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  // ── Auto-detect pipeline state from existing data ──
  const pipeline: PipelineState = {
    contacted: (messages && messages.length > 0) || false,
    contacted_date: messages?.[0]?.sent_at || messages?.[0]?.created_at || null,
    visit_done: (visits && visits.some(v => v.status === 'completed')) || false,
    visit_date: visits?.find(v => v.status === 'completed')?.scheduled_date || null,
    quote_sent: (quotes && quotes.some(q => ['sent', 'accepted', 'declined'].includes(q.status))) || false,
    quote_date: quotes?.find(q => ['sent', 'accepted'].includes(q.status))?.created_at || null,
    won: (quotes && quotes.some(q => q.status === 'accepted')) || false,
    won_date: quotes?.find(q => q.status === 'accepted')?.created_at || null,
  }

  // Also check follow_ups for contact (calls/emails)
  if (!pipeline.contacted && followUps) {
    const contactFups = followUps.filter(f =>
      ['call', 'email'].includes(f.category) && f.status === 'completed'
    )
    if (contactFups.length > 0) {
      pipeline.contacted = true
      pipeline.contacted_date = contactFups[0].completed_at || contactFups[0].created_at
    }
  }
  // Check follow_ups for won
  if (!pipeline.won && followUps) {
    const wonFups = followUps.filter(f =>
      ['payment', 'follow_up'].includes(f.category) &&
      f.title?.toLowerCase().includes('won') && f.status === 'completed'
    )
    if (wonFups.length > 0) {
      pipeline.won = true
      pipeline.won_date = wonFups[0].completed_at || wonFups[0].created_at
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
          </div>
          <p className="mt-1 text-sm text-muted">Client since {formatDate(client.created_at)}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/quotes/new?client=${client.id}`}>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" /> New Quote
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline + Info Panel */}
        <div className="space-y-6">
          {/* Pipeline */}
          <ClientPipeline clientId={client.id} initial={pipeline} />

          {/* Info Panel */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Contact Info</h2>
            </div>
            <div className="space-y-3">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Phone className="h-4 w-4 text-primary/70" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Mail className="h-4 w-4 text-primary/70" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2 text-sm text-muted">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary/70" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-medium text-foreground">Notes</h3>
                <p className="text-sm text-muted whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Quotes</h2>
              </div>
              <Link href={`/quotes/new?client=${client.id}`}>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" /> New
                </Button>
              </Link>
            </div>
            {quotes && quotes.length > 0 ? (
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-card-hover"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {quote.quote_number} — {quote.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted">{formatDate(quote.created_at)}</p>
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
              <p className="py-6 text-center text-sm text-muted">No quotes yet</p>
            )}
          </div>

          {/* Visits */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Visits</h2>
            </div>
            {visits && visits.length > 0 ? (
              <div className="space-y-2">
                {visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/visits/${visit.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-card-hover"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{visit.title || 'Visit'}</p>
                      <p className="text-xs text-muted">
                        {visit.scheduled_date ? formatDate(visit.scheduled_date) : 'No date'}
                        {visit.address ? ` • ${visit.address}` : ''}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(visit.status)}>{visit.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted">No visits yet</p>
            )}
          </div>

          {/* Messages */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Recent Messages</h2>
            </div>
            {messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {msg.direction}
                      </span>
                      <span className="text-xs text-muted">{formatDate(msg.sent_at)}</span>
                    </div>
                    <p className="text-sm text-muted">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted">No messages yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

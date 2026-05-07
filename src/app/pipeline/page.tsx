'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  CalendarDays,
  Camera,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  Phone,
  Send,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  Loader2,
  ChefHat,
  Home,
  RefreshCw,
  CreditCard,
  Image as ImageIcon,
  MapPin,
} from 'lucide-react'

// ---------- TYPES ----------
type Client = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

type Visit = {
  id: string
  client_id: string
  status: string
  scheduled_date: string | null
  notes: string | null
}

type Quote = {
  id: string
  client_id: string
  status: string
  total: number
  title: string
  created_at: string
}

type PipelineItem = {
  client: Client
  stage: PipelineStage
  visit?: Visit | null
  quote?: Quote | null
}

type PipelineStage = 'new_lead' | 'visit_scheduled' | 'visit_done' | 'quote_sent' | 'won' | 'lost'

const STAGES: { key: PipelineStage; label: string; icon: any; color: string }[] = [
  { key: 'new_lead', label: '📩 New Lead', icon: MessageSquare, color: 'border-l-blue-500' },
  { key: 'visit_scheduled', label: '📅 Visit Scheduled', icon: CalendarDays, color: 'border-l-amber-500' },
  { key: 'visit_done', label: '🔍 Visit Done', icon: Camera, color: 'border-l-purple-500' },
  { key: 'quote_sent', label: '📄 Quote Sent', icon: FileText, color: 'border-l-indigo-500' },
  { key: 'won', label: '✅ Won', icon: ThumbsUp, color: 'border-l-green-500' },
  { key: 'lost', label: '❌ Lost', icon: ThumbsDown, color: 'border-l-red-500' },
]

export default function PipelinePage() {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [stageCounts, setStageCounts] = useState<Record<PipelineStage, number>>({
    new_lead: 0, visit_scheduled: 0, visit_done: 0, quote_sent: 0, won: 0, lost: 0
  })

  const fetchPipeline = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Fetch all data in parallel
      const [clientsRes, visitsRes, quotesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('visits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('quotes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      const clients = (clientsRes.data || []) as Client[]
      const visits = (visitsRes.data || []) as Visit[]
      const quotes = (quotesRes.data || []) as Quote[]

      // Build pipeline: determine stage for each client
      const pipeline: PipelineItem[] = clients.map(client => {
        const clientVisits = visits.filter(v => v.client_id === client.id)
        const clientQuotes = quotes.filter(q => q.client_id === client.id)

        // Latest visit / quote
        const latestVisit = clientVisits.length > 0 ? clientVisits[0] : null
        const latestQuote = clientQuotes.length > 0 ? clientQuotes[0] : null

        let stage: PipelineStage = 'new_lead'

        if (latestQuote?.status === 'accepted') {
          stage = 'won'
        } else if (latestQuote?.status === 'declined') {
          stage = 'lost'
        } else if (latestQuote && ['sent', 'draft'].includes(latestQuote.status)) {
          stage = 'quote_sent'
        } else if (latestVisit?.status === 'completed') {
          stage = 'visit_done'
        } else if (latestVisit && ['scheduled', 'pending'].includes(latestVisit.status)) {
          stage = 'visit_scheduled'
        } else {
          stage = 'new_lead'
        }

        return { client, stage, visit: latestVisit, quote: latestQuote }
      })

      setItems(pipeline)
      
      // Calculate counts
      const counts: Record<PipelineStage, number> = {
        new_lead: 0, visit_scheduled: 0, visit_done: 0, quote_sent: 0, won: 0, lost: 0
      }
      pipeline.forEach(i => counts[i.stage]++)
      setStageCounts(counts)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => { fetchPipeline() }, [])

  // ---------- ACTIONS ----------
  const handleAction = async (action: string, clientId: string) => {
    setActionLoading(`${action}-${clientId}`)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      switch (action) {
        case 'schedule_visit': {
          // Create visit + navigate to edit
          const { data: visit, error } = await supabase.from('visits').insert({
            user_id: user.id,
            client_id: clientId,
            title: 'Site Visit',
            status: 'scheduled',
            scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
          }).select().single()
          if (!error && visit) {
            router.push(`/visits/${visit.id}`)
          }
          break
        }
        case 'visit_done': {
          await supabase.from('visits').update({ status: 'completed' }).eq('client_id', clientId).eq('user_id', user.id)
          break
        }
        case 'take_photos': {
          const client = items.find(i => i.client.id === clientId)?.client
          // Navigate to gallery with client pre-selected to take/upload photos
          router.push(`/gallery?client=${clientId}&name=${encodeURIComponent(client?.name || '')}`)
          return
        }
        case 'create_quote': {
          router.push(`/quotes/new?client=${clientId}`)
          return // don't refetch, navigating away
        }
        case 'mark_quote_sent': {
          await supabase.from('quotes').update({ status: 'sent' }).eq('client_id', clientId).eq('user_id', user.id)
          break
        }
        case 'client_yes': {
          await supabase.from('quotes').update({ status: 'accepted' }).eq('client_id', clientId).eq('user_id', user.id)
          break
        }
        case 'client_no': {
          await supabase.from('quotes').update({ status: 'declined' }).eq('client_id', clientId).eq('user_id', user.id)
          break
        }
        case 'create_invoice': {
          router.push(`/invoices?client=${clientId}`)
          return
        }
        case 'stripe_payment': {
          const client = items.find(i => i.client.id === clientId)?.client
          const quote = items.find(i => i.client.id === clientId)?.quote
          const amount = quote?.total || 0
          // Open Stripe payment page or create payment link
          if (amount > 0) {
            window.open(`https://buy.stripe.com/test_cNifZi4Tx8CdeDZ2laeUU00?prefilled_email=${encodeURIComponent(client?.email || '')}&amount=${Math.round(amount * 100)}`, '_blank')
          }
          return
        }
        case 'send_sms': {
          const client = items.find(i => i.client.id === clientId)?.client
          if (client?.phone) {
            window.open(`sms:${client.phone}`, '_blank')
          }
          return
        }
      }
      // Refetch after action
      await fetchPipeline()
    } catch (err: any) {
      setError(err.message)
    }
    setActionLoading(null)
  }

  const getActions = (item: PipelineItem) => {
    switch (item.stage) {
      case 'new_lead':
        return [
          { id: 'send_sms', label: '📱 Text Client', icon: Send, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
          { id: 'schedule_visit', label: '📅 Schedule Visit', icon: CalendarDays, color: 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10' },
        ]
      case 'visit_scheduled':
        return [
          { id: 'visit_done', label: '✅ Visit Done', icon: CheckCircle2, color: 'text-green-400 border-green-500/30 hover:bg-green-500/10' },
          { id: 'take_photos', label: '📸 Take Photos', icon: ImageIcon, color: 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10' },
          { id: 'send_sms', label: '📱 Remind', icon: Send, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
        ]
      case 'visit_done':
        return [
          { id: 'take_photos', label: '📸 Add Photos', icon: ImageIcon, color: 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10' },
          { id: 'create_quote', label: '📄 Create Quote', icon: FileText, color: 'text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10' },
          { id: 'send_sms', label: '📱 Send Quote', icon: Send, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
        ]
      case 'quote_sent':
        return [
          { id: 'client_yes', label: '✅ Client Said Yes', icon: ThumbsUp, color: 'text-green-400 border-green-500/30 hover:bg-green-500/10' },
          { id: 'client_no', label: '❌ Client Said No', icon: ThumbsDown, color: 'text-red-400 border-red-500/30 hover:bg-red-500/10' },
          { id: 'send_sms', label: '📱 Follow Up', icon: Send, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
        ]
      case 'won':
        return [
          { id: 'create_invoice', label: '💰 Create Invoice', icon: FileText, color: 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10' },
          { id: 'stripe_payment', label: '💳 Take Payment', icon: CreditCard, color: 'text-green-400 border-green-500/30 hover:bg-green-500/10' },
          { id: 'send_sms', label: '📱 Thank You', icon: Send, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
        ]
      case 'lost':
        return [
          { id: 'send_sms', label: '📱 Follow Up Later', icon: Send, color: 'text-gray-400 border-gray-500/30 hover:bg-gray-500/10' },
        ]
    }
  }

  const getNextStage = (stage: PipelineStage): string => {
    const labels: Record<PipelineStage, string> = {
      new_lead: '→ Schedule Visit',
      visit_scheduled: '→ Complete Visit',
      visit_done: '→ Send Quote',
      quote_sent: '→ Awaiting Response',
      won: '→ Create Invoice',
      lost: '→ Archived',
    }
    return labels[stage]
  }

  const getStageIcon = (stage: PipelineStage) => {
    const s = STAGES.find(s => s.key === stage)
    return s?.icon || RefreshCw
  }

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const groupedItems = (stage: PipelineStage) => items.filter(i => i.stage === stage)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-card-border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                Pipeline
              </h1>
              <p className="text-sm text-muted mt-1">Follow your leads from first message to completed job</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchPipeline}
                className="rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
          </div>
          {/* Stage counters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {STAGES.map(s => {
              const count = stageCounts[s.key] || 0
              return (
                <div key={s.key} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${s.color.replace('border-l-', 'border-')} bg-background/50`}>
                  <span>{s.label.split(' ')[0]}</span>
                  <span className="text-foreground font-bold">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Pipeline Kanban - Stacked Cards Layout */}
      <div className="space-y-4">
        {STAGES.map(stage => {
          const stageItems = groupedItems(stage.key)
          const Icon = stage.icon
          return (
            <div key={stage.key} className={`rounded-xl border border-card-border bg-card overflow-hidden ${stage.color} border-l-4`}>
              {/* Stage Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-card-border bg-background/30">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">{stage.label}</h2>
                  <span className="text-xs text-muted bg-background/50 rounded-full px-2 py-0.5">{stageItems.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2">
                {stageItems.length === 0 ? (
                  <div className="py-6 text-center">
                    <Icon className="h-8 w-8 mx-auto text-muted/30 mb-2" />
                    <p className="text-xs text-muted">No clients at this stage</p>
                  </div>
                ) : (
                  stageItems.map(item => (
                    <PipelineCard
                      key={item.client.id}
                      item={item}
                      actions={getActions(item)}
                      actionLoading={actionLoading}
                      onAction={handleAction}
                      nextStage={getNextStage(item.stage)}
                      StageIcon={getStageIcon(item.stage)}
                      router={router}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- PIPELINE CARD ----------
function PipelineCard({
  item, actions, actionLoading, onAction, nextStage, StageIcon, router
}: {
  item: PipelineItem
  actions: { id: string; label: string; icon: any; color: string }[]
  actionLoading: string | null
  onAction: (action: string, clientId: string) => void
  nextStage: string
  StageIcon: any
  router: any
}) {
  const client = item.client
  const daysSinceCreation = Math.ceil((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="rounded-xl border border-card-border bg-background/50 p-4 hover:bg-card-hover transition-all duration-200 group">
      {/* Client Info - Clickable */}
      <div
        className="cursor-pointer"
        onClick={() => router.push(`/clients/${client.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {client.name}
              </h3>
              <span className="text-[10px] text-muted bg-background/50 rounded-full px-1.5 py-0.5">
                {daysSinceCreation}d
              </span>
            </div>
            {client.phone && (
              <p className="text-xs text-muted mt-0.5">{client.phone}</p>
            )}
            {client.address && (
              <p className="text-xs text-muted/70 mt-0.5 truncate">{client.address}</p>
            )}
          </div>
          {/* Quick info */}
          <div className="text-right flex-shrink-0 ml-3">
            {item.visit && (
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <CalendarDays className="h-3 w-3" />
                {item.visit.scheduled_date ? new Date(item.visit.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'No date'}
              </div>
            )}
            {item.quote && (
              <div className="flex items-center gap-1 text-[10px] text-muted mt-0.5">
                <FileText className="h-3 w-3" />
                ${item.quote.total?.toFixed(0) || '0'}
              </div>
            )}
          </div>
        </div>

        {/* Quote preview if exists */}
        {item.quote && (
          <div className="mt-2 rounded-lg border border-border/50 bg-background/30 p-2">
            <p className="text-xs font-medium text-foreground">{item.quote.title || 'Quote'}</p>
            <p className="text-xs text-muted mt-0.5">${item.quote.total?.toFixed(2)} • {item.quote.status}</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-2.5 border-t border-border/50" />

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-1.5">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id, client.id)}
            disabled={actionLoading === `${action.id}-${client.id}`}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${action.color} disabled:opacity-50`}
          >
            {actionLoading === `${action.id}-${client.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <action.icon className="h-3 w-3" />
            )}
            {action.label}
          </button>
        ))}
      </div>

      {/* Next stage hint */}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted/50">
        <StageIcon className="h-3 w-3" />
        <span>{nextStage}</span>
      </div>
    </div>
  )
}

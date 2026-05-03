'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Copy,
  Check,
  CheckCircle2,
  SendHorizonal,
  Clock,
  Calendar,
  User,
  FileText,
  MailQuestion,
  ClipboardList,
  Star,
  DollarSign,
  RotateCcw,
  Users,
  RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FollowUpType =
  | 'enquiry'
  | 'quote'
  | 'site_visit'
  | 'job'
  | 'review'
  | 'payment'
  | 'old_lead'

type Client = {
  id: string
  name: string
  phone: string | null
  email: string | null
}

type FollowUpRecord = {
  id: string
  user_id: string
  client_id: string
  title: string
  description: string | null
  due_date: string
  status: 'pending' | 'completed' | 'cancelled'
  category: string
  created_at: string
  completed_at: string | null
  clients?: { name: string } | null
}

// ---------------------------------------------------------------------------
// Follow-up type definitions
// ---------------------------------------------------------------------------

interface FollowUpTypeDef {
  key: FollowUpType
  label: string
  icon: React.ReactNode
  template: string
  jobTypeLabel: string
}

const FOLLOW_UP_TYPES: FollowUpTypeDef[] = [
  {
    key: 'enquiry',
    label: 'After New Enquiry',
    icon: <MailQuestion className="h-4 w-4" />,
    template:
      "Hi, thanks for your enquiry. I'll be in touch shortly. In the meantime, if you have any photos or measurements of the area, feel free to send them through. Thanks, Antonio.",
    jobTypeLabel: 'New Enquiry',
  },
  {
    key: 'quote',
    label: 'After Sending Quote',
    icon: <FileText className="h-4 w-4" />,
    template:
      'Hi, just following up on the quote I sent. Let me know if you have any questions or if you would like to go ahead. Thanks, Antonio.',
    jobTypeLabel: 'Quote Follow-up',
  },
  {
    key: 'site_visit',
    label: 'After Site Visit',
    icon: <ClipboardList className="h-4 w-4" />,
    template:
      "Hi, thanks for your time today. I'll put together the quote and send it through as soon as possible. Let me know if you think of anything else. Thanks, Antonio.",
    jobTypeLabel: 'Site Visit',
  },
  {
    key: 'job',
    label: 'After Job Completion',
    icon: <CheckCircle2 className="h-4 w-4" />,
    template:
      "Hi, thanks again for the job. I hope you're happy with the work. If you have a moment, I'd really appreciate a Google review. It helps my small business a lot. Thanks, Antonio.",
    jobTypeLabel: 'Job Completion',
  },
  {
    key: 'review',
    label: 'Asking for Google Review',
    icon: <Star className="h-4 w-4" />,
    template:
      "Hi, thanks again for the job. I hope you're happy with the work. If you have a moment, I'd really appreciate a Google review. It helps my small business a lot. Thanks, Antonio.",
    jobTypeLabel: 'Google Review',
  },
  {
    key: 'payment',
    label: 'Payment Reminder',
    icon: <DollarSign className="h-4 w-4" />,
    template:
      'Hi, just a friendly reminder about the invoice. Let me know once payment has been processed. Thanks, Antonio.',
    jobTypeLabel: 'Payment Reminder',
  },
  {
    key: 'old_lead',
    label: 'Old Lead Reactivation',
    icon: <RotateCcw className="h-4 w-4" />,
    template:
      "Hi, hope you're doing well. Just checking in about the quote I sent earlier. Happy to answer any questions or adjust if needed. Let me know if you're still interested. Thanks, Antonio.",
    jobTypeLabel: 'Lead Reactivation',
  },
]

const TYPE_MAP = Object.fromEntries(FOLLOW_UP_TYPES.map((t) => [t.key, t]))

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function FollowUpSystemPage() {
  const supabase = createClient()

  // Clients
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')

  // Follow-up type & message
  const [selectedType, setSelectedType] = useState<FollowUpType>('enquiry')
  const [message, setMessage] = useState(FOLLOW_UP_TYPES[0].template)
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  // Follow-up history
  const [history, setHistory] = useState<FollowUpRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // ---------- Load clients ----------

  useEffect(() => {
    const fetchClients = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .eq('user_id', user.id)
        .order('name')
      if (data) setClients(data as Client[])
    }
    fetchClients()
  }, [])

  // ---------- Load follow-up history ----------

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoadingHistory(false)
      return
    }
    const { data } = await supabase
      .from('follow_ups')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .in('category', [
        'enquiry',
        'quote',
        'site_visit',
        'job',
        'review',
        'payment',
        'old_lead',
      ])
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setHistory(data as unknown as FollowUpRecord[])
    setLoadingHistory(false)
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // ---------- Handle type change ----------

  const handleTypeChange = (type: FollowUpType) => {
    setSelectedType(type)
    setMessage(TYPE_MAP[type].template)
  }

  // ---------- Copy message ----------

  const handleCopy = useCallback(async () => {
    if (!message.trim()) return
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      toast.success('Message copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }, [message])

  // ---------- Mark as done ----------

  const handleMarkDone = useCallback(async () => {
    if (!selectedClientId) {
      toast.error('Please select a client first')
      return
    }
    if (!message.trim()) {
      toast.error('Message cannot be empty')
      return
    }

    setSending(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setSending(false)
      return
    }

    const typeDef = TYPE_MAP[selectedType]
    const now = new Date().toISOString()
    const payload = {
      user_id: user.id,
      client_id: selectedClientId,
      title: `${typeDef.jobTypeLabel} — ${clients.find((c) => c.id === selectedClientId)?.name || 'Unknown'}`,
      description: message.trim(),
      due_date: now.split('T')[0],
      priority: 'normal' as const,
      category: selectedType,
      status: 'completed' as const,
      completed_at: now,
    }

    const { error } = await supabase.from('follow_ups').insert(payload)

    setSending(false)
    if (error) {
      // If table schema doesn't match, fall back to pure UI state
      toast.error('Could not save to database. Saved locally.')
    } else {
      toast.success('Follow-up marked as done!')
    }

    // Always update UI state
    setHistory((prev) => [
      {
        id: `temp-${Date.now()}`,
        ...payload,
        created_at: now,
        clients: { name: clients.find((c) => c.id === selectedClientId)?.name || 'Unknown' },
      },
      ...prev,
    ])
    setSelectedClientId('')
    setSelectedType('enquiry')
    setMessage(FOLLOW_UP_TYPES[0].template)
  }, [selectedClientId, selectedType, message, clients])

  // ---------- Refresh handler ----------

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  const activeTypeDef = TYPE_MAP[selectedType]

  // ---------- Render ----------

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">
          Follow-Up System
        </h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Create and send follow-up messages using pre-written templates
        </p>
      </div>

      {/* ---------- Create Follow-Up Section ---------- */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 border-b border-[#1e3a5f] pb-4">
          <MessageSquare className="h-5 w-5 text-teal-400" />
          <h2 className="text-base font-semibold text-[#f1f5f9]">
            New Follow-Up Message
          </h2>
        </div>

        <div className="space-y-4">
          {/* Client selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-xl border border-[#1e3a5f] bg-[#0a0f1c] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#94a3b8]/40 transition-all duration-200 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` — ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up type selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Follow-Up Type *
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {FOLLOW_UP_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => handleTypeChange(type.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                    selectedType === type.key
                      ? 'border-teal-400/60 bg-teal-400/10 text-teal-400'
                      : 'border-[#1e3a5f] bg-[#131c31] text-[#94a3b8] hover:border-teal-400/30 hover:bg-[#1a2744] hover:text-[#f1f5f9]'
                  }`}
                >
                  <span
                    className={
                      selectedType === type.key
                        ? 'text-teal-400'
                        : 'text-[#94a3b8]'
                    }
                  >
                    {type.icon}
                  </span>
                  <span className="truncate">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message template */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-[#1e3a5f] bg-[#0a0f1c] px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#94a3b8]/40 transition-all duration-200 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="primary"
              onClick={handleCopy}
              disabled={!message.trim()}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Message
                </>
              )}
            </Button>
            <Button
              variant="success"
              onClick={handleMarkDone}
              loading={sending}
              disabled={!selectedClientId || !message.trim()}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark as Done
            </Button>
          </div>
        </div>
      </Card>

      {/* ---------- Follow-Up History ---------- */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-[#1e3a5f] pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-semibold text-[#f1f5f9]">
              Recent Follow-Ups
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHistory}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loadingHistory ? (
          <p className="py-8 text-center text-sm text-[#94a3b8]">Loading...</p>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <MailQuestion className="mb-3 h-8 w-8 text-[#94a3b8]/50" />
            <p className="text-sm text-[#94a3b8]">
              No follow-ups recorded yet. Create your first one above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const typeDef = TYPE_MAP[item.category as FollowUpType]
              const isCompleted = item.status === 'completed'
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#1e293b] bg-[#131c31] px-4 py-3 transition-all hover:border-[#1e3a5f] sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left: info */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-sm font-medium text-[#f1f5f9]">
                        <User className="h-3.5 w-3.5 text-[#94a3b8]" />
                        {item.clients?.name || 'Unknown'}
                      </span>
                      {typeDef && (
                        <Badge variant="blue">{typeDef.jobTypeLabel}</Badge>
                      )}
                      <Badge variant={isCompleted ? 'green' : 'amber'}>
                        {isCompleted ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#94a3b8]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </span>
                      {item.completed_at && (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-teal-400" />
                          Completed {formatDate(item.completed_at)}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="line-clamp-1 text-xs text-[#94a3b8]/70">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Right: action */}
                  {item.description && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            item.description || ''
                          )
                          toast.success('Message copied')
                        } catch {
                          toast.error('Failed to copy')
                        }
                      }}
                      className="shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Mail, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailMessage {
  id: string
  client_id: string
  type: 'email'
  direction: string
  subject: string
  body: string
  status: string
  sent_at: string
  clients?: { name: string; email: string } | null
}

export default function EmailsPage() {
  const supabase = createClient()
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent' | 'draft' | 'failed'>('all')

  const fetchEmails = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('messages')
      .select('*, clients(name, email)')
      .eq('user_id', user.id)
      .eq('type', 'email')
      .order('sent_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    if (data) setEmails(data as unknown as EmailMessage[])
    setLoading(false)
  }

  useEffect(() => {
    fetchEmails()
  }, [filter])

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'draft': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-muted" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sent Emails</h1>
          <p className="mt-1 text-sm text-muted">History of all emails sent through Tradios</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchEmails}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'sent', 'draft', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary/20 text-primary'
                : 'bg-card text-muted hover:text-foreground border border-border'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Emails list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted/50" />
            <p className="text-sm text-muted">No emails sent yet</p>
            <p className="mt-1 text-xs text-muted/70">
              Send an email from the Clients page to see it here
            </p>
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {statusIcon(email.status)}
                    <p className="truncate text-sm font-medium text-foreground">
                      {email.subject}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    To: {email.clients?.name || 'Unknown'} {email.clients?.email ? `<${email.clients.email}>` : ''}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted/70">
                    {email.body}
                  </p>
                  <p className="mt-2 text-xs text-muted/50">
                    {formatDate(email.sent_at)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

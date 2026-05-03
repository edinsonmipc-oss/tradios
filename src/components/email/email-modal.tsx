'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailModalProps {
  open: boolean
  onClose: () => void
  clientName: string
  clientEmail: string
  clientId: string
}

export function EmailModal({ open, onClose, clientName, clientEmail, clientId }: EmailModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in subject and body')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: subject.trim(),
          body: body.trim(),
          client_id: clientId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to send email')
      } else {
        toast.success(data.sent ? '✅ Email sent!' : '📝 Saved as draft (configure RESEND_API_KEY)')
        setSubject('')
        setBody('')
        onClose()
      }
    } catch (err: any) {
      toast.error('Network error')
    }
    setSending(false)
  }

  const insertTemplate = (type: string) => {
    const templates: Record<string, { subject: string; body: string }> = {
      quote: {
        subject: `Quote for ${clientName}`,
        body: `Hi ${clientName},

Thank you for considering us for your project. Please find attached a detailed quote outlining the scope of work, materials, labour, and total cost.

We're available if you have any questions or would like to discuss further.

Kind regards`,
      },
      followup: {
        subject: `Following up — ${clientName}`,
        body: `Hi ${clientName},

Just checking in on the quote we provided. I'd love to know if you have any questions or if there's anything else we can help with.

Looking forward to hearing from you.

Cheers`,
      },
      reminder: {
        subject: `Reminder: Scheduled work`,
        body: `Hi ${clientName},

This is a friendly reminder that we have work scheduled with you. Please let us know if you need to reschedule or if anything has changed.

Thanks`,
      },
      thankyou: {
        subject: `Thank you, ${clientName}!`,
        body: `Hi ${clientName},

Thank you for choosing our services. It was a pleasure working with you.

If you're happy with the outcome, we'd really appreciate a Google review — it helps small businesses like ours a lot!

Thanks again`,
      },
    }

    const t = templates[type]
    if (t) {
      setSubject(t.subject)
      setBody(t.body)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Email to ${clientName}`}>
      <div className="space-y-4">
        {/* Templates */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => insertTemplate('quote')}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
          >
            📄 Quote
          </button>
          <button
            onClick={() => insertTemplate('followup')}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
          >
            🔄 Follow-Up
          </button>
          <button
            onClick={() => insertTemplate('reminder')}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
          >
            ⏰ Reminder
          </button>
          <button
            onClick={() => insertTemplate('thankyou')}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
          >
            🙏 Thank You
          </button>
        </div>

        {/* Recipient */}
        <p className="text-xs text-muted">
          To: <span className="text-foreground font-medium">{clientEmail}</span>
        </p>

        {/* Subject */}
        <Input
          id="email-subject"
          label="Subject"
          placeholder="Subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {/* Body */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 transition-all duration-200 hover:border-muted-dark focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/40 resize-y"
            placeholder="Write your email message..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSend}
            loading={sending}
            disabled={!subject.trim() || !body.trim()}
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

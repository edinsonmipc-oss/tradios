'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { Download, Send, CheckCircle, XCircle } from 'lucide-react'

export default function QuoteActions({
  quoteId,
  status,
  clientId,
}: {
  quoteId: string
  status: string
  clientId: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleMarkAs = async (newStatus: string) => {
    const { error } = await supabase
      .from('quotes')
      .update({
        status: newStatus,
        ...(newStatus === 'sent' ? { sent_at: new Date().toISOString() } : {}),
        ...(newStatus === 'accepted' || newStatus === 'declined'
          ? { response_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', quoteId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Quote marked as ${newStatus}`)
      router.refresh()
    }
  }

  const handleDownloadPDF = async () => {
    toast.success('PDF generation started...')
    // PDF generation placeholder
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleMarkAs('sent')}
        >
          <Send className="h-4 w-4" /> Send to Client
        </Button>
      )}
      {status === 'sent' && (
        <>
          <Button
            variant="success"
            size="sm"
            onClick={() => handleMarkAs('accepted')}
          >
            <CheckCircle className="h-4 w-4" /> Mark Accepted
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleMarkAs('declined')}
          >
            <XCircle className="h-4 w-4" /> Mark Declined
          </Button>
        </>
      )}
      <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
        <Download className="h-4 w-4" /> Download PDF
      </Button>
    </div>
  )
}

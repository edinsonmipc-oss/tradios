'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, FileText } from 'lucide-react'

export default function VisitActions({
  visitId,
  status,
  clientId,
}: {
  visitId: string
  status: string
  clientId: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleStatusUpdate = async (newStatus: string) => {
    const { error } = await supabase
      .from('visits')
      .update({ status: newStatus })
      .eq('id', visitId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Visit ${newStatus}`)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'scheduled' && (
        <>
          <Button
            variant="success"
            size="sm"
            onClick={() => handleStatusUpdate('completed')}
          >
            <CheckCircle className="h-4 w-4" /> Mark Complete
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleStatusUpdate('cancelled')}
          >
            <XCircle className="h-4 w-4" /> Cancel
          </Button>
        </>
      )}
      <Link href={`/quotes/new?client=${clientId}`}>
        <Button variant="secondary" size="sm">
          <FileText className="h-4 w-4" /> Create Quote
        </Button>
      </Link>
    </div>
  )
}

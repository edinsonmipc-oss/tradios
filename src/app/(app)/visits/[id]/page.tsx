import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import VisitActions from './actions'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VisitDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: visit } = await supabase
    .from('visits')
    .select('*, clients(name, phone, email, address)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!visit) notFound()

  const { data: photos } = await supabase
    .from('gallery')
    .select('*')
    .eq('visit_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/visits">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {visit.title || 'Visit'}
            </h1>
            <Badge variant={statusBadgeVariant(visit.status)}>
              {visit.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {visit.clients?.name || 'Unknown'} •{' '}
            {visit.scheduled_date ? formatDate(visit.scheduled_date) : 'No date'}
          </p>
        </div>
        <VisitActions
          visitId={visit.id}
          status={visit.status}
          clientId={visit.client_id}
        />
      </div>

      {/* Client & Address */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Client</h2>
          <p className="text-sm text-foreground">{visit.clients?.name || 'Unknown'}</p>
          {visit.clients?.phone && (
            <p className="text-sm text-muted">{visit.clients.phone}</p>
          )}
          {visit.clients?.email && (
            <p className="text-sm text-muted">{visit.clients.email}</p>
          )}
        </Card>
        {visit.address && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Address</h2>
            <p className="text-sm text-muted">{visit.address}</p>
          </Card>
        )}
      </div>

      {/* Notes */}
      {visit.notes && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted">{visit.notes}</p>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Photos</h2>
          </div>
        </div>
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo: any) => (
              <div
                key={photo.id}
                className="aspect-square overflow-hidden rounded-lg border border-border bg-background"
              >
                <img
                  src={photo.url}
                  alt={photo.title || 'Photo'}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            No photos uploaded yet
          </p>
        )}
      </Card>
    </div>
  )
}

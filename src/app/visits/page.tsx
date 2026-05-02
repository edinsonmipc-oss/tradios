'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Visit, Client } from '@/lib/utils'

function ScheduleVisitModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (data) setClients(data as Client[])
    }
    if (open) fetchClients()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id || !form.scheduled_date) {
      toast.error('Client and date are required')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    const scheduledDate = form.scheduled_time
      ? `${form.scheduled_date}T${form.scheduled_time}:00`
      : form.scheduled_date

    const { error } = await supabase.from('visits').insert({
      user_id: user.id,
      client_id: form.client_id,
      title: form.title || 'Site Visit',
      scheduled_date: scheduledDate,
      address: form.address || null,
      notes: form.notes || null,
      status: 'scheduled',
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Visit scheduled!')
      onCreated()
      onClose()
      setForm({
        client_id: '',
        title: '',
        scheduled_date: '',
        scheduled_time: '',
        address: '',
        notes: '',
      })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule Visit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Client *</label>
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Input
          id="visit-title"
          label="Title"
          placeholder="e.g. Electrical Safety Check"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="visit-date"
            label="Date *"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            required
          />
          <Input
            id="visit-time"
            label="Time"
            type="time"
            value={form.scheduled_time}
            onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
          />
        </div>
        <Input
          id="visit-address"
          label="Address"
          placeholder="Job site address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Visit notes..."
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Schedule</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function VisitsPage() {
  const supabase = createClient()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchVisits = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('visits')
      .select('*, clients(name, phone)')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: false })
    if (data) setVisits(data as unknown as Visit[])
    setLoading(false)
  }

  useEffect(() => {
    fetchVisits()
  }, [])

  const grouped = {
    scheduled: visits.filter((v) => v.status === 'scheduled'),
    completed: visits.filter((v) => v.status === 'completed'),
    cancelled: visits.filter((v) => v.status === 'cancelled' || v.status === 'rescheduled'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visits</h1>
          <p className="mt-1 text-sm text-muted">Schedule and manage site visits</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Schedule Visit
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted py-12">Loading...</p>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <CalendarIcon className="mb-3 h-10 w-10 text-muted/50" />
          <p className="text-sm text-muted">No visits yet</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4" /> Schedule your first visit
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Scheduled */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Scheduled ({grouped.scheduled.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.scheduled.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
            {grouped.scheduled.length === 0 && (
              <p className="text-sm text-muted">No scheduled visits</p>
            )}
          </section>

          {/* Completed */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Completed ({grouped.completed.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.completed.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
            {grouped.completed.length === 0 && (
              <p className="text-sm text-muted">No completed visits</p>
            )}
          </section>

          {/* Cancelled */}
          {(grouped.cancelled.length > 0) && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Cancelled ({grouped.cancelled.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.cancelled.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ScheduleVisitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchVisits}
      />
    </div>
  )
}

function VisitCard({ visit }: { visit: Visit }) {
  return (
    <Link
      href={`/visits/${visit.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-foreground">
          {visit.clients?.name || 'Unknown'}
        </p>
        <Badge variant={statusBadgeVariant(visit.status)}>
          {visit.status}
        </Badge>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted">
          {visit.scheduled_date ? formatDate(visit.scheduled_date) : 'No date'}
        </p>
        {visit.address && (
          <p className="text-xs text-muted truncate">{visit.address}</p>
        )}
      </div>
    </Link>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import {
  Plus,
  Bell,
  Phone,
  Mail,
  Wrench,
  AlertCircle,
  FileText,
  DollarSign,
  CheckCircle2,
  Calendar,
  Clock,
  MoreHorizontal,
  Edit3,
  Trash2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

// ---------- types ----------

type FollowUp = {
  id: string
  user_id: string
  client_id: string
  title: string
  description: string | null
  due_date: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'completed' | 'cancelled'
  category: 'call' | 'email' | 'visit' | 'reminder' | 'follow_up' | 'quote' | 'payment'
  completed_at: string | null
  created_at: string
  clients?: { name: string } | null
}

type Client = {
  id: string
  name: string
}

type TabFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed'

type PriorityOption = 'low' | 'normal' | 'high' | 'urgent'
type CategoryOption = 'call' | 'email' | 'visit' | 'reminder' | 'follow_up' | 'quote' | 'payment'

// ---------- helpers ----------

const PRIORITY_CONFIG: Record<PriorityOption, { label: string; icon: string; variant: 'red' | 'blue' | 'amber' | 'gray'; order: number }> = {
  urgent: { label: 'Urgent', icon: '🔴', variant: 'red', order: 0 },
  high: { label: 'High', icon: '🟡', variant: 'amber', order: 1 },
  normal: { label: 'Normal', icon: '🔵', variant: 'blue', order: 2 },
  low: { label: 'Low', icon: '⚪', variant: 'gray', order: 3 },
}

const CATEGORY_CONFIG: Record<CategoryOption, { label: string; icon: React.ReactNode }> = {
  call: { label: 'Call', icon: <Phone className="h-4 w-4" /> },
  email: { label: 'Email', icon: <Mail className="h-4 w-4" /> },
  visit: { label: 'Visit', icon: <Wrench className="h-4 w-4" /> },
  reminder: { label: 'Reminder', icon: <Bell className="h-4 w-4" /> },
  follow_up: { label: 'Follow-up', icon: <AlertCircle className="h-4 w-4" /> },
  quote: { label: 'Quote', icon: <FileText className="h-4 w-4" /> },
  payment: { label: 'Payment', icon: <DollarSign className="h-4 w-4" /> },
}

function isOverdue(dueDate: string, status: string): boolean {
  if (status !== 'pending') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function isToday(dueDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due.getTime() === today.getTime()
}

function daysRemaining(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function getStatusVariant(status: string, overdue: boolean): 'red' | 'green' | 'gray' {
  if (overdue && status === 'pending') return 'red'
  if (status === 'completed') return 'green'
  return 'gray'
}

const PRIORITIES: PriorityOption[] = ['low', 'normal', 'high', 'urgent']
const CATEGORIES: CategoryOption[] = ['call', 'email', 'visit', 'reminder', 'follow_up', 'quote', 'payment']
const STATUSES = ['pending', 'completed', 'cancelled'] as const

// ---------- Add/Edit Follow-Up Modal ----------

function FollowUpModal({
  open,
  onClose,
  onSaved,
  followUp,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  followUp?: FollowUp | null
}) {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const todayIso = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    description: '',
    due_date: todayIso,
    priority: 'normal' as PriorityOption,
    category: 'follow_up' as CategoryOption,
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
  })

  const isEditing = !!followUp

  // Reset form when modal opens/closes or followUp changes
  useEffect(() => {
    if (open) {
      if (followUp) {
        setForm({
          client_id: followUp.client_id,
          title: followUp.title,
          description: followUp.description || '',
          due_date: followUp.due_date.split('T')[0],
          priority: followUp.priority,
          category: followUp.category,
          status: followUp.status,
        })
      } else {
        setForm({
          client_id: '',
          title: '',
          description: '',
          due_date: todayIso,
          priority: 'normal',
          category: 'follow_up',
          status: 'pending',
        })
      }
    }
  }, [open, followUp])

  // Fetch clients when modal opens
  useEffect(() => {
    if (!open) return
    const fetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')
      if (data) setClients(data as Client[])
    }
    fetchClients()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.client_id) {
      toast.error('Please select a client')
      return
    }
    if (!form.due_date) {
      toast.error('Due date is required')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    const payload = {
      client_id: form.client_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date,
      priority: form.priority,
      category: form.category,
      status: form.status,
      completed_at: form.status === 'completed' ? new Date().toISOString() : null,
      user_id: user.id,
    }

    if (isEditing) {
      const { error } = await supabase
        .from('follow_ups')
        .update(payload)
        .eq('id', followUp.id)

      setLoading(false)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Follow-up updated!')
        onSaved()
        onClose()
      }
    } else {
      const { error } = await supabase
        .from('follow_ups')
        .insert(payload)

      setLoading(false)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Follow-up created!')
        onSaved()
        onClose()
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Follow-Up' : 'New Follow-Up'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input
          id="followup-title"
          label="Title *"
          placeholder="e.g. Follow up on quote #123"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

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
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="followup-due-date"
            label="Due Date *"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as PriorityOption })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as CategoryOption })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'pending' | 'completed' | 'cancelled' })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Additional details about this follow-up..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Plus className="h-4 w-4" />
            {isEditing ? 'Update Follow-Up' : 'Create Follow-Up'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Confirm Delete Modal ----------

function ConfirmDeleteModal({
  open,
  onClose,
  onDeleted,
  followUp,
}: {
  open: boolean
  onClose: () => void
  onDeleted: () => void
  followUp: FollowUp | null
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!followUp) return
    setLoading(true)
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', followUp.id)

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Follow-up deleted')
      onDeleted()
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete Follow-Up">
      <p className="text-sm text-muted mb-6">
        Are you sure you want to delete{' '}
        <strong className="text-foreground">&ldquo;{followUp?.title}&rdquo;</strong>? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" loading={loading} onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </Modal>
  )
}

// ---------- Follow-Up Card ----------

function FollowUpCard({
  followUp,
  onEdit,
  onDeleted,
  onCompleted,
}: {
  followUp: FollowUp
  onEdit: (f: FollowUp) => void
  onDeleted: (f: FollowUp) => void
  onCompleted: (f: FollowUp) => void
}) {
  const overdue = isOverdue(followUp.due_date, followUp.status)
  const today = isToday(followUp.due_date)
  const remaining = daysRemaining(followUp.due_date)
  const priorityConfig = PRIORITY_CONFIG[followUp.priority]
  const categoryConfig = CATEGORY_CONFIG[followUp.category]
  const isComplete = followUp.status === 'completed'

  return (
    <div
      className={`rounded-xl border p-4 transition-all hover:shadow-sm ${
        overdue
          ? 'border-red-500/30 bg-red-500/5'
          : today
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-border bg-card hover:border-primary/30'
      }`}
    >
      {/* Top row: Priority badge + status */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={priorityConfig.variant}>
            {priorityConfig.icon} {priorityConfig.label}
          </Badge>
          {overdue && (
            <Badge variant="red">
              Overdue
            </Badge>
          )}
        </div>
        <Badge variant={getStatusVariant(followUp.status, overdue)}>
          {isComplete ? 'Completed' : followUp.status}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {followUp.title}
      </h3>

      {/* Client name */}
      <p className="mb-2 text-xs text-muted">
        {followUp.clients?.name || 'Unknown client'}
      </p>

      {/* Description */}
      {followUp.description && (
        <p className="mb-3 text-xs text-muted/70 line-clamp-2">
          {followUp.description}
        </p>
      )}

      {/* Due date info */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <Calendar className="h-3.5 w-3.5 text-muted" />
        <span className={overdue ? 'text-red-400 font-medium' : today ? 'text-amber-400 font-medium' : 'text-muted'}>
          {formatDate(followUp.due_date)}
        </span>
        {!isComplete && (
          <span className={`flex items-center gap-1 ${
            overdue ? 'text-red-400' : remaining <= 2 ? 'text-amber-400' : 'text-muted'
          }`}>
            <Clock className="h-3 w-3" />
            {overdue ? `${Math.abs(remaining)}d overdue` : remaining === 0 ? 'Today' : `${remaining}d left`}
          </span>
        )}
      </div>

      {/* Category */}
      <div className="mb-3 flex items-center gap-1.5 text-xs text-muted/70">
        {categoryConfig.icon}
        <span>{categoryConfig.label}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        {!isComplete && followUp.status !== 'cancelled' && (
          <Button
            variant="success"
            size="sm"
            onClick={() => onCompleted(followUp)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(followUp)}
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleted(followUp)}
          className="text-muted hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function FollowUpsPage() {
  const supabase = createClient()
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null)
  const [deletingFollowUp, setDeletingFollowUp] = useState<FollowUp | null>(null)

  const fetchFollowUps = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('follow_ups')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })

    if (data) setFollowUps(data as unknown as FollowUp[])
    setLoading(false)
  }

  useEffect(() => {
    fetchFollowUps()
  }, [])

  // Compute summary stats
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const todayIso = now.toISOString().split('T')[0]

  const overdueCount = followUps.filter((f) => isOverdue(f.due_date, f.status)).length
  const todayCount = followUps.filter((f) => f.status === 'pending' && isToday(f.due_date)).length
  const upcomingCount = followUps.filter((f) => {
    if (f.status !== 'pending') return false
    const due = new Date(f.due_date)
    due.setHours(0, 0, 0, 0)
    return due > now
  }).length
  const completedToday = followUps.filter((f) => {
    if (f.status !== 'completed' || !f.completed_at) return false
    const completedDate = new Date(f.completed_at).toISOString().split('T')[0]
    return completedDate === todayIso
  }).length

  // Filter follow-ups based on active tab
  const filteredFollowUps = followUps.filter((f) => {
    switch (activeTab) {
      case 'overdue':
        return isOverdue(f.due_date, f.status)
      case 'today':
        return isToday(f.due_date) && f.status === 'pending'
      case 'upcoming':
        return daysRemaining(f.due_date) > 0 && f.status === 'pending'
      case 'completed':
        return f.status === 'completed'
      default:
        return true
    }
  })

  // Sort: overdue first, then by due date ascending
  const sortedFollowUps = [...filteredFollowUps].sort((a, b) => {
    const aOverdue = isOverdue(a.due_date, a.status) ? 0 : 1
    const bOverdue = isOverdue(b.due_date, b.status) ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const handleEdit = (f: FollowUp) => {
    setEditingFollowUp(f)
    setShowModal(true)
  }

  const handleDelete = (f: FollowUp) => {
    setDeletingFollowUp(f)
  }

  const handleComplete = async (f: FollowUp) => {
    const { error } = await supabase
      .from('follow_ups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', f.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Follow-up completed!')
      fetchFollowUps()
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingFollowUp(null)
  }

  const handleModalSaved = () => {
    fetchFollowUps()
  }

  const handleDeleted = () => {
    fetchFollowUps()
  }

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue', count: overdueCount },
    { key: 'today', label: 'Today', count: todayCount },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-Ups</h1>
          <p className="mt-1 text-sm text-muted">Client follow-ups and reminders</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> New Follow-Up
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Today</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{todayCount}</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Upcoming</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">{upcomingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Completed Today</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{completedToday}</p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  activeTab === tab.key
                    ? 'bg-primary/20 text-primary'
                    : 'bg-card-hover text-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Follow-Up Cards */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted">Loading...</p>
      ) : sortedFollowUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <Bell className="mb-3 h-10 w-10 text-muted/50" />
          <p className="text-sm text-muted">
            {activeTab === 'all'
              ? 'No follow-ups yet'
              : `No ${activeTab} follow-ups`}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4" /> Create your first follow-up
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFollowUps.map((f) => (
            <FollowUpCard
              key={f.id}
              followUp={f}
              onEdit={handleEdit}
              onDeleted={handleDelete}
              onCompleted={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <FollowUpModal
        open={showModal}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
        followUp={editingFollowUp}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deletingFollowUp}
        onClose={() => setDeletingFollowUp(null)}
        onDeleted={handleDeleted}
        followUp={deletingFollowUp}
      />
    </div>
  )
}

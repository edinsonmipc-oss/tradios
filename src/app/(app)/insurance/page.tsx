'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import {
  Shield,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Edit3,
  Trash2,
  Calendar,
  Bell,
  RefreshCw,
  DollarSign,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

// ---------- types ----------

type Insurance = {
  id: string
  user_id: string
  type: string
  provider: string | null
  policy_number: string | null
  coverage_amount: number | null
  start_date: string | null
  expiry_date: string | null
  premium_amount: number | null
  renewal_period: string | null
  renewal_cost: number | null
  notification_days: number | null
  documents: string[] | null
  notes: string | null
  status: string
  created_at: string
}

const INSURANCE_TYPES = [
  'Public Liability',
  'Car Insurance',
  'Work Insurance',
  'Tool Insurance',
  'Income Protection',
  'Life Insurance',
  'Health Insurance',
  'Other',
]

const RENEWAL_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: '6months', label: 'Every 6 months' },
  { value: 'annual', label: 'Annual' },
  { value: 'biennial', label: 'Every 2 years' },
  { value: 'custom', label: 'Custom date' },
]

const TYPE_ICONS: Record<string, string> = {
  'Public Liability': '🛡️',
  'Car Insurance': '🚗',
  'Work Insurance': '🔧',
  'Tool Insurance': '🔨',
  'Income Protection': '💰',
  'Life Insurance': '❤️',
  'Health Insurance': '🏥',
  'Other': '📋',
}

const RENEWAL_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  '6months': 'Every 6 months',
  annual: 'Annual',
  biennial: 'Every 2 years',
  custom: 'Custom',
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getStatusInfo(insurance: Insurance) {
  const { status, expiry_date } = insurance
  if (status === 'cancelled') return { label: 'Cancelled', variant: 'red' as const, daysLeft: null }
  if (status === 'expired') return { label: 'Expired', variant: 'red' as const, daysLeft: null }

  const daysLeft = getDaysUntil(expiry_date)
  if (daysLeft === null) return { label: 'Active', variant: 'green' as const, daysLeft: null }
  if (daysLeft < 0) return { label: 'Expired', variant: 'red' as const, daysLeft }
  if (daysLeft <= 15) return { label: `${daysLeft}d left`, variant: 'red' as const, daysLeft }
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, variant: 'amber' as const, daysLeft }
  if (daysLeft <= 60) return { label: `${daysLeft}d left`, variant: 'amber' as const, daysLeft }
  return { label: `${daysLeft}d left`, variant: 'green' as const, daysLeft }
}

// ---------- Add Insurance Modal ----------

function AddInsuranceModal({
  open,
  onClose,
  onCreated,
  editInsurance,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  editInsurance?: Insurance | null
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'Public Liability',
    provider: '',
    policy_number: '',
    coverage_amount: '',
    start_date: '',
    expiry_date: '',
    premium_amount: '',
    renewal_period: 'annual',
    renewal_cost: '',
    notification_days: '30',
    notes: '',
    status: 'active',
  })

  useEffect(() => {
    if (editInsurance) {
      setForm({
        type: editInsurance.type,
        provider: editInsurance.provider || '',
        policy_number: editInsurance.policy_number || '',
        coverage_amount: editInsurance.coverage_amount?.toString() || '',
        start_date: editInsurance.start_date || '',
        expiry_date: editInsurance.expiry_date || '',
        premium_amount: editInsurance.premium_amount?.toString() || '',
        renewal_period: editInsurance.renewal_period || 'annual',
        renewal_cost: editInsurance.renewal_cost?.toString() || '',
        notification_days: editInsurance.notification_days?.toString() || '30',
        notes: editInsurance.notes || '',
        status: editInsurance.status,
      })
    } else {
      setForm({
        type: 'Public Liability',
        provider: '',
        policy_number: '',
        coverage_amount: '',
        start_date: '',
        expiry_date: '',
        premium_amount: '',
        renewal_period: 'annual',
        renewal_cost: '',
        notification_days: '30',
        notes: '',
        status: 'active',
      })
    }
  }, [editInsurance, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.provider.trim()) {
      toast.error('Provider name is required')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    const data = {
      user_id: user.id,
      type: form.type,
      provider: form.provider.trim(),
      policy_number: form.policy_number.trim() || null,
      coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
      start_date: form.start_date || null,
      expiry_date: form.expiry_date || null,
      premium_amount: form.premium_amount ? parseFloat(form.premium_amount) : null,
      renewal_period: form.renewal_period,
      renewal_cost: form.renewal_cost ? parseFloat(form.renewal_cost) : null,
      notification_days: parseInt(form.notification_days) || 30,
      notes: form.notes.trim() || null,
      status: form.status,
    }

    let error
    if (editInsurance) {
      ;({ error } = await supabase
        .from('insurances')
        .update(data)
        .eq('id', editInsurance.id))
      if (!error) toast.success('Insurance updated!')
    } else {
      ;({ error } = await supabase.from('insurances').insert(data))
      if (!error) toast.success('Insurance added!')
    }

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      onCreated()
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editInsurance ? 'Edit Insurance' : 'Add Insurance'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Insurance Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {INSURANCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Input
            label="Provider *"
            placeholder="e.g. Allianz"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Policy Number"
            placeholder="e.g. POL-12345"
            value={form.policy_number}
            onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
          />
          <Input
            label="Coverage ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 20000000"
            value={form.coverage_amount}
            onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          <Input
            label="Expiry Date"
            type="date"
            value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Premium ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.premium_amount}
            onChange={(e) => setForm({ ...form, premium_amount: e.target.value })}
          />
          <Input
            label="Renewal Cost ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="Same as premium"
            value={form.renewal_cost}
            onChange={(e) => setForm({ ...form, renewal_cost: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Renewal Period</label>
            <select
              value={form.renewal_period}
              onChange={(e) => setForm({ ...form, renewal_period: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {RENEWAL_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Remind me (days before)"
            type="number"
            min="1"
            max="365"
            value={form.notification_days}
            onChange={(e) => setForm({ ...form, notification_days: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Policy details, renewal reminders, contact info..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Plus className="h-4 w-4" />
            {editInsurance ? 'Update' : 'Add Insurance'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Renewal Timeline ----------

function RenewalTimeline({ insurances }: { insurances: Insurance[] }) {
  const upcoming = insurances
    .filter((i) => {
      if (i.status === 'cancelled') return false
      const days = getDaysUntil(i.expiry_date)
      return days !== null
    })
    .sort((a, b) => {
      const da = getDaysUntil(a.expiry_date) ?? 9999
      const db = getDaysUntil(b.expiry_date) ?? 9999
      return da - db
    })
    .slice(0, 10)

  if (upcoming.length === 0) return null

  const barWidth = (days: number) => {
    const max = 365
    const pct = Math.max(0, Math.min(100, ((max - days) / max) * 100))
    return `${pct}%`
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">Renewal Timeline</h2>
      </div>

      <div className="space-y-3">
        {upcoming.map((insurance) => {
          const days = getDaysUntil(insurance.expiry_date)!
          const info = getStatusInfo(insurance)
          const isUrgent = days <= 15
          const isWarning = days <= 60 && days > 15
          const monthsLeft = Math.floor(days / 30)

          return (
            <div key={insurance.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{TYPE_ICONS[insurance.type] || '📋'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {insurance.type}
                    </p>
                    {insurance.provider && (
                      <p className="text-xs text-muted truncate">{insurance.provider}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted ml-2 hidden sm:block">
                    {insurance.expiry_date && formatDate(insurance.expiry_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {insurance.renewal_cost && insurance.renewal_cost > 0 && (
                    <span className="text-xs text-muted">
                      ${insurance.renewal_cost.toLocaleString()}
                    </span>
                  )}
                  <span className={`text-sm font-bold ${
                    isUrgent ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {days <= 0 ? 'OVERDUE' : days === 1 ? '1 day' : monthsLeft >= 1 ? `${monthsLeft}mo` : `${days}d`}
                  </span>
                  <Badge variant={info.variant}>{info.label}</Badge>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: barWidth(days) }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------- Main Page ----------

export default function InsurancePage() {
  const supabase = createClient()
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editInsurance, setEditInsurance] = useState<Insurance | null>(null)

  const fetchInsurances = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('insurances')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setInsurances(data as Insurance[])
    setLoading(false)
  }

  useEffect(() => {
    fetchInsurances()
  }, [])

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(`Delete ${type} insurance?`)) return
    const { error } = await supabase.from('insurances').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Insurance deleted')
      fetchInsurances()
    }
  }

  const filtered = insurances.filter((i) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      i.type.toLowerCase().includes(q) ||
      (i.provider || '').toLowerCase().includes(q) ||
      (i.policy_number || '').toLowerCase().includes(q)
    )
  })

  // Stats
  const activeCount = insurances.filter(i => {
    if (i.status === 'cancelled' || i.status === 'expired') return false
    const days = getDaysUntil(i.expiry_date)
    return days === null || days >= 0
  }).length

  const urgentCount = insurances.filter(i => {
    if (i.status === 'cancelled') return false
    const days = getDaysUntil(i.expiry_date)
    return days !== null && days >= 0 && days <= 15
  }).length

  const warningCount = insurances.filter(i => {
    if (i.status === 'cancelled') return false
    const days = getDaysUntil(i.expiry_date)
    return days !== null && days > 15 && days <= 60
  }).length

  const expiredCount = insurances.filter(i => {
    if (i.status === 'expired' || i.status === 'cancelled') return true
    const days = getDaysUntil(i.expiry_date)
    return days !== null && days < 0
  }).length

  const annualCost = insurances
    .filter(i => {
      if (i.status === 'cancelled' || i.status === 'expired') return false
      const days = getDaysUntil(i.expiry_date)
      return days === null || days >= 0
    })
    .reduce((sum, i) => sum + (i.renewal_cost || i.premium_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insurance</h1>
          <p className="text-sm text-muted mt-1">Never miss a renewal again</p>
        </div>
        <Button onClick={() => { setEditInsurance(null); setShowAddModal(true) }}>
          <Plus className="h-4 w-4" /> Add Insurance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3.5 border-green-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted">Active</p>
            </div>
          </div>
        </Card>
        <Card className={`p-3.5 ${urgentCount > 0 ? 'border-red-500/30' : ''}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-6 w-6 flex-shrink-0 ${urgentCount > 0 ? 'text-red-500' : 'text-muted'}`} />
            <div>
              <p className="text-xl font-bold text-foreground">{urgentCount}</p>
              <p className="text-xs text-muted">Urgent (≤15d)</p>
            </div>
          </div>
        </Card>
        <Card className={`p-3.5 ${warningCount > 0 ? 'border-amber-500/30' : ''}`}>
          <div className="flex items-center gap-2">
            <Bell className={`h-6 w-6 flex-shrink-0 ${warningCount > 0 ? 'text-amber-500' : 'text-muted'}`} />
            <div>
              <p className="text-xl font-bold text-foreground">{warningCount}</p>
              <p className="text-xs text-muted">Soon (16-60d)</p>
            </div>
          </div>
        </Card>
        <Card className={`p-3.5 ${expiredCount > 0 ? 'border-red-500/30' : ''}`}>
          <div className="flex items-center gap-2">
            <XCircle className={`h-6 w-6 flex-shrink-0 ${expiredCount > 0 ? 'text-red-500' : 'text-muted'}`} />
            <div>
              <p className="text-xl font-bold text-foreground">{expiredCount}</p>
              <p className="text-xs text-muted">Expired</p>
            </div>
          </div>
        </Card>
        <Card className="p-3.5 border-primary/20">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary flex-shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">${annualCost.toLocaleString()}</p>
              <p className="text-xs text-muted">Annual Cost</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Renewal Timeline */}
      {!loading && <RenewalTimeline insurances={insurances} />}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search insurances..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Insurance Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted/50 mb-3" />
          <p className="text-muted">
            {search ? 'No insurances match your search' : 'No insurances yet — add your first one!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((insurance) => {
            const info = getStatusInfo(insurance)
            const days = getDaysUntil(insurance.expiry_date)
            const isUrgent = days !== null && days >= 0 && days <= 15
            const isWarning = days !== null && days > 15 && days <= 60

            return (
              <Card key={insurance.id} className={`p-4 hover:border-primary/30 transition-colors ${
                isUrgent ? 'border-l-4 border-l-red-500' :
                isWarning ? 'border-l-4 border-l-amber-500' :
                info.variant === 'red' ? 'border-l-4 border-l-red-500' :
                'border-l-4 border-l-emerald-500'
              }`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl flex-shrink-0">{TYPE_ICONS[insurance.type] || '📋'}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{insurance.type}</h3>
                      {insurance.provider && (
                        <p className="text-xs text-muted truncate">{insurance.provider}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={info.variant} className="flex-shrink-0">{info.label}</Badge>
                </div>

                {/* Renewal Countdown */}
                {days !== null && (
                  <div className={`text-center py-2 rounded-lg mb-3 ${
                    isUrgent ? 'bg-red-500/10 text-red-500' :
                    isWarning ? 'bg-amber-500/10 text-amber-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <p className="text-2xl font-bold">{days <= 0 ? 'OVERDUE' : `${days}`}</p>
                    <p className="text-xs font-medium">{days <= 0 ? 'Expired!' : 'days until renewal'}</p>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-1.5 text-sm">
                  {insurance.policy_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                      <span className="text-muted truncate">{insurance.policy_number}</span>
                    </div>
                  )}
                  {insurance.coverage_amount && (
                    <p className="text-foreground font-medium">
                      Coverage: ${insurance.coverage_amount.toLocaleString()}
                    </p>
                  )}
                  {insurance.expiry_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                      <span className={`${isUrgent ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-muted'}`}>
                        Expires: {formatDate(insurance.expiry_date)}
                      </span>
                    </div>
                  )}
                  {insurance.renewal_period && (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                      <span className="text-muted">
                        Renews: {RENEWAL_LABELS[insurance.renewal_period] || insurance.renewal_period}
                      </span>
                    </div>
                  )}
                  {insurance.premium_amount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                      <span className="text-muted">
                        Premium: ${insurance.premium_amount.toLocaleString()}
                        {insurance.renewal_cost && insurance.renewal_cost !== insurance.premium_amount &&
                          ` → Renewal: $${insurance.renewal_cost.toLocaleString()}`
                        }
                      </span>
                    </div>
                  )}
                  {insurance.notification_days && (
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                      <span className="text-muted">
                        Remind {insurance.notification_days} days before
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {insurance.notes && (
                  <p className="text-xs text-muted mt-2 pt-2 border-t border-border italic">
                    {insurance.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => { setEditInsurance(insurance); setShowAddModal(true) }}
                    className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(insurance.id, insurance.type)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddInsuranceModal
          open={showAddModal}
          onClose={() => { setShowAddModal(false); setEditInsurance(null) }}
          onCreated={fetchInsurances}
          editInsurance={editInsurance}
        />
      )}
    </div>
  )
}

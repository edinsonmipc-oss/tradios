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
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
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

function getStatusBadge(status: string, expiryDate: string | null) {
  if (status === 'cancelled') return { label: 'Cancelled', variant: 'red' as const }
  if (status === 'expired') return { label: 'Expired', variant: 'red' as const }
  
  // Check if expiring soon (within 30 days)
  if (expiryDate) {
    const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { label: 'Expired', variant: 'red' as const }
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, variant: 'amber' as const }
  }
  
  return { label: 'Active', variant: 'green' as const }
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
    notes: '',
    status: 'active',
  })

  // Pre-fill form when editing
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
      notes: form.notes.trim() || null,
      status: form.status,
    }

    let error
    if (editInsurance) {
      // Update existing
      ;({ error } = await supabase
        .from('insurances')
        .update(data)
        .eq('id', editInsurance.id))
      if (!error) toast.success('Insurance updated!')
    } else {
      // Insert new
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
          placeholder="e.g. Allianz, AAMI, NRMA"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Policy Number"
            placeholder="e.g. POL-12345"
            value={form.policy_number}
            onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
          />
          <Input
            label="Premium ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.premium_amount}
            onChange={(e) => setForm({ ...form, premium_amount: e.target.value })}
          />
        </div>

        <Input
          label="Coverage Amount ($)"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 20000000"
          value={form.coverage_amount}
          onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })}
        />

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
            placeholder="Policy details, renewal reminders..."
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

  // Summary stats
  const activeCount = insurances.filter(i => {
    if (i.status === 'cancelled' || i.status === 'expired') return false
    if (i.expiry_date && new Date(i.expiry_date) < new Date()) return false
    return true
  }).length

  const expiringSoon = insurances.filter(i => {
    if (i.status === 'cancelled') return false
    if (!i.expiry_date) return false
    const daysLeft = Math.ceil((new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 30
  }).length

  const expiredCount = insurances.filter(i => {
    if (i.status === 'expired' || i.status === 'cancelled') return true
    if (i.expiry_date && new Date(i.expiry_date) < new Date()) return true
    return false
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insurance</h1>
          <p className="text-sm text-muted mt-1">Manage your business insurances</p>
        </div>
        <Button onClick={() => { setEditInsurance(null); setShowAddModal(true) }}>
          <Plus className="h-4 w-4" /> Add Insurance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-green-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted">Active</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${expiringSoon > 0 ? 'border-amber-500/30' : ''}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${expiringSoon > 0 ? 'text-amber-500' : 'text-muted'}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{expiringSoon}</p>
              <p className="text-xs text-muted">Expiring Soon</p>
            </div>
          </div>
        </Card>
        <Card className={`p-4 ${expiredCount > 0 ? 'border-red-500/30' : ''}`}>
          <div className="flex items-center gap-3">
            <XCircle className={`h-8 w-8 ${expiredCount > 0 ? 'text-red-500' : 'text-muted'}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{expiredCount}</p>
              <p className="text-xs text-muted">Expired / Cancelled</p>
            </div>
          </div>
        </Card>
      </div>

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

      {/* Insurance List */}
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
            const badge = getStatusBadge(insurance.status, insurance.expiry_date)
            return (
              <Card key={insurance.id} className="p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{TYPE_ICONS[insurance.type] || '📋'}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{insurance.type}</h3>
                      {insurance.provider && (
                        <p className="text-xs text-muted">{insurance.provider}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  {insurance.policy_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted" />
                      <span className="text-muted">{insurance.policy_number}</span>
                    </div>
                  )}
                  {insurance.coverage_amount && (
                    <p className="text-foreground font-medium">
                      Coverage: {formatCurrency(insurance.coverage_amount)}
                    </p>
                  )}
                  {insurance.premium_amount && (
                    <p className="text-muted">
                      Premium: {formatCurrency(insurance.premium_amount)}
                    </p>
                  )}
                  {insurance.expiry_date && (
                    <p className={`text-xs ${
                      badge.variant === 'red' ? 'text-red-500' :
                      badge.variant === 'amber' ? 'text-amber-500' :
                      'text-muted'
                    }`}>
                      Expires: {formatDate(insurance.expiry_date)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-border">
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

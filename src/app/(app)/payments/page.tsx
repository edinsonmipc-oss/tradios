'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  Plus,
  Search,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Trash2,
  Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ---------- types ----------

type Client = {
  id: string
  name: string
}

type Invoice = {
  id: string
  invoice_number: string
  total: number
  client_id: string
  clients?: { name: string }
}

type Payment = {
  id: string
  user_id: string
  invoice_id: string | null
  client_id: string
  amount: number
  method: 'cash' | 'bank_transfer' | 'card' | 'other'
  reference: string | null
  notes: string | null
  paid_at: string
  created_at: string
  clients?: { name: string }
  invoices?: { invoice_number: string } | null
}

const METHOD_ICONS: Record<string, { icon: typeof CreditCard; label: string }> = {
  cash: { icon: DollarSign, label: 'Cash' },
  bank_transfer: { icon: Building2, label: 'Bank Transfer' },
  card: { icon: CreditCard, label: 'Card' },
  other: { icon: CreditCard, label: 'Other' },
}

// ---------- Record Payment Modal ----------

function RecordPaymentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [form, setForm] = useState({
    client_id: '',
    invoice_id: '',
    amount: '',
    method: 'bank_transfer' as Payment['method'],
    reference: '',
    notes: '',
    paid_at: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (!open) return
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [clientsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id).order('name'),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, client_id')
          .eq('user_id', user.id)
          .in('status', ['sent', 'overdue'])
          .order('created_at', { ascending: false }),
      ])

      if (clientsRes.data) setClients(clientsRes.data as Client[])
      if (invoicesRes.data) setInvoices(invoicesRes.data as Invoice[])
    }
    fetchData()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id) {
      toast.error('Please select a client')
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    // Create the payment record
    const { error: payError } = await supabase.from('payments').insert({
      user_id: user.id,
      client_id: form.client_id,
      invoice_id: form.invoice_id || null,
      amount,
      method: form.method,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
      paid_at: new Date(form.paid_at).toISOString(),
    })

    if (payError) {
      toast.error(payError.message)
      setLoading(false)
      return
    }

    // If linked to an invoice, update its status if fully paid
    if (form.invoice_id) {
      const invoice = invoices.find((inv) => inv.id === form.invoice_id)
      if (invoice) {
        // Get total paid for this invoice
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', form.invoice_id)

        const totalPaid = (paymentsData || []).reduce(
          (sum: number, p: any) => sum + Number(p.amount),
          amount
        )

        if (totalPaid >= Number(invoice.total)) {
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_amount: totalPaid,
              paid_at: new Date(form.paid_at).toISOString(),
            })
            .eq('id', form.invoice_id)
        }
      }
    }

    setLoading(false)
    toast.success('Payment recorded!')
    setForm({
      client_id: '',
      invoice_id: '',
      amount: '',
      method: 'bank_transfer',
      reference: '',
      notes: '',
      paid_at: new Date().toISOString().split('T')[0],
    })
    onCreated()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Client *</label>
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice (optional) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Invoice (optional)</label>
          <select
            value={form.invoice_id}
            onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">No invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {formatCurrency(inv.total)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="pay-amount"
            label="Amount ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <Input
            id="pay-date"
            label="Payment Date"
            type="date"
            value={form.paid_at}
            onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
          />
        </div>

        {/* Method */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Payment Method</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as Payment['method'] })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Reference */}
        <Input
          id="pay-reference"
          label="Reference"
          placeholder="e.g. BSB/Account ref"
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
        />

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Main Page ----------

export default function PaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    let query = supabase
      .from('payments')
      .select('*, clients(name), invoices(invoice_number)')
      .eq('user_id', user.id)
      .order('paid_at', { ascending: false })

    if (search.trim()) {
      query = query.or(
        `reference.ilike.%${search.trim()}%,notes.ilike.%${search.trim()}%`
      )
    }

    const { data } = await query
    if (data) setPayments(data as unknown as Payment[])
    setLoading(false)
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  // Summary calculations
  const now = new Date()
  const thisMonthPayments = payments.filter((p) => {
    const d = new Date(p.paid_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalAllTime = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const count = payments.length
  const averagePayment = count > 0 ? totalAllTime / count : 0

  const handleDelete = async (payment: Payment) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return

    const { error } = await supabase.from('payments').delete().eq('id', payment.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Payment deleted')
      fetchPayments()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted">Track all incoming payments</p>
        </div>
        <Button variant="gold" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted">This Month</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-emerald-400">
            {loading ? '...' : formatCurrency(totalThisMonth)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted">All Time</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">
            {loading ? '...' : formatCurrency(totalAllTime)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted">Count</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">
            {loading ? '...' : count}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-muted">Average</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">
            {loading ? '...' : formatCurrency(averagePayment)}
          </p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search reference or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchPayments() }}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden sm:table-cell">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Invoice</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">Loading...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <DollarSign className="h-8 w-8 text-muted/50" />
                    <p>No payments recorded yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const methodInfo = METHOD_ICONS[payment.method] || METHOD_ICONS.other
                return (
                  <tr key={payment.id} className="transition-colors hover:bg-card-hover">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {payment.clients?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted sm:table-cell">
                      <span className="flex items-center gap-1.5">
                        {methodInfo.icon === DollarSign ? (
                          <DollarSign className="h-3.5 w-3.5" />
                        ) : methodInfo.icon === Building2 ? (
                          <Building2 className="h-3.5 w-3.5" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        {methodInfo.label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted md:table-cell">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(payment.paid_at)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted lg:table-cell">
                      {payment.reference || '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted lg:table-cell">
                      {payment.invoices?.invoice_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(payment)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchPayments}
      />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { formatDate, formatCurrency, calculateGST } from '@/lib/utils'
import {
  Receipt,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  FileText,
  CreditCard,
  Calendar,
  DollarSign,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ---------- types ----------

type Client = {
  id: string
  name: string
}

type Quote = {
  id: string
  quote_number: string
  title: string
  items: any[]
  subtotal: number
  tax: number
  total: number
  clients?: { name: string }
}

type InvoiceItem = {
  description: string
  quantity: number
  unit: string
  rate: number
  total: number
}

type Invoice = {
  id: string
  user_id: string
  quote_id: string | null
  client_id: string
  invoice_number: string
  title: string
  items: InvoiceItem[]
  subtotal: number
  gst: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date: string | null
  paid_at: string | null
  paid_amount: number | null
  notes: string | null
  created_at: string
  clients?: { name: string }
}

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_BADGE: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  draft: 'gray',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
}

// ---------- Helpers ----------

function generateInvoiceNumber(lastNumber: number): string {
  const year = new Date().getFullYear()
  const num = String(lastNumber + 1).padStart(4, '0')
  return `INV-${year}-${num}`
}

function emptyItem(): InvoiceItem {
  return { description: '', quantity: 1, unit: 'each', rate: 0, total: 0 }
}

// ---------- Add Invoice Modal ----------

function AddInvoiceModal({
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
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState('')
  const [autoNumber, setAutoNumber] = useState('')
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    due_date: '',
    notes: '',
  })
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()])

  // Fetch clients, quotes, and next invoice number when modal opens
  useEffect(() => {
    if (!open) return
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [clientsRes, quotesRes, seqRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id).order('name'),
        supabase
          .from('quotes')
          .select('id, quote_number, title, items, subtotal, tax, total, clients(name)')
          .eq('user_id', user.id)
          .in('status', ['accepted', 'sent'])
          .order('created_at', { ascending: false }),
        supabase
          .from('invoice_sequences')
          .select('last_number')
          .eq('user_id', user.id)
          .single(),
      ])

      if (clientsRes.data) setClients(clientsRes.data as Client[])
      if (quotesRes.data) setQuotes(quotesRes.data as unknown as Quote[])

      // Auto-generate invoice number
      let lastNum = 0
      if (seqRes.data) {
        lastNum = (seqRes.data as any).last_number || 0
      } else {
        // Check if there are existing invoices
        const { data: existingInvs } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (existingInvs && existingInvs.length > 0) {
          const match = existingInvs[0].invoice_number.match(/INV-\d+-(\d+)/)
          if (match) lastNum = parseInt(match[1])
        }
      }
      setAutoNumber(generateInvoiceNumber(lastNum))
    }
    init()
  }, [open])

  // When a quote is selected, prefill form from quote
  useEffect(() => {
    if (!selectedQuoteId) return
    const quote = quotes.find((q) => q.id === selectedQuoteId)
    if (!quote) return
    setForm((prev) => ({
      ...prev,
      title: quote.title || '',
      client_id: (quote as any).client_id || '',
    }))
    if (quote.items && quote.items.length > 0) {
      const mapped = quote.items.map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'each',
        rate: item.rate || 0,
        total: (item.quantity || 1) * (item.rate || 0),
      }))
      setItems(mapped)
    }
  }, [selectedQuoteId])

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items]
    const item = { ...updated[index] }

    if (field === 'description') {
      item.description = value as string
    } else if (field === 'unit') {
      item.unit = value as string
    } else if (field === 'quantity') {
      item.quantity = parseFloat(value as string) || 0
    } else if (field === 'rate') {
      item.rate = parseFloat(value as string) || 0
    }

    item.total = item.quantity * item.rate
    updated[index] = item
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, emptyItem()])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const gst = calculateGST(subtotal)
  const total = subtotal + gst

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id) {
      toast.error('Please select a client')
      return
    }
    if (!form.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      toast.error('Please add at least one item')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    // Get next sequence number
    let invNumber = autoNumber
    const { data: seqData } = await supabase
      .from('invoice_sequences')
      .select('last_number')
      .eq('user_id', user.id)
      .single()

    if (seqData) {
      const lastNum = (seqData as any).last_number || 0
      invNumber = generateInvoiceNumber(lastNum)
      // Update sequence
      await supabase
        .from('invoice_sequences')
        .update({ last_number: lastNum + 1 })
        .eq('user_id', user.id)
    } else {
      // Create sequence row
      await supabase.from('invoice_sequences').insert({
        user_id: user.id,
        last_number: 1,
      })
      invNumber = generateInvoiceNumber(0)
    }

    const { error } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: form.client_id,
      quote_id: selectedQuoteId || null,
      invoice_number: invNumber,
      title: form.title.trim(),
      items,
      subtotal,
      gst,
      total,
      status: 'draft',
      due_date: form.due_date || null,
      notes: form.notes.trim() || null,
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Invoice created!')
      setForm({ client_id: '', title: '', due_date: '', notes: '' })
      setItems([emptyItem()])
      setSelectedQuoteId('')
      onCreated()
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Invoice" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Invoice Number */}
        <div className="rounded-lg border border-card-border bg-background px-4 py-2.5">
          <p className="text-xs text-muted">Invoice Number</p>
          <p className="text-sm font-semibold text-foreground">{autoNumber || 'Generating...'}</p>
        </div>

        {/* Convert from Quote */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Convert from Quote (optional)</label>
          <select
            value={selectedQuoteId}
            onChange={(e) => setSelectedQuoteId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a quote...</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quote_number} — {q.clients?.name || 'Unknown'} ({formatCurrency(q.total)})
              </option>
            ))}
          </select>
        </div>

        {/* Client & Title */}
        <div className="grid grid-cols-2 gap-3">
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
          <Input
            id="inv-title"
            label="Title *"
            placeholder="e.g. Kitchen Reno"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <Input
          id="inv-due-date"
          label="Due Date"
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />

        {/* Items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-muted">Line Items</label>
            <Button type="button" variant="ghost" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-card-border bg-background p-3"
              >
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="0"
                      step="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="each">each</option>
                      <option value="hour">hour</option>
                      <option value="day">day</option>
                      <option value="m2">m²</option>
                      <option value="m">m</option>
                      <option value="kg">kg</option>
                      <option value="lot">lot</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Rate"
                      min="0"
                      step="0.01"
                      value={item.rate || ''}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-xs font-semibold text-foreground">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-muted hover:text-red-400 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-lg border border-card-border bg-background p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">GST (10%)</span>
            <span className="text-foreground">{formatCurrency(gst)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-card-border pt-1.5">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

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
          <Button type="submit" variant="gold" loading={loading}>
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Mark as Paid Modal ----------

function MarkPaidModal({
  open,
  onClose,
  invoice,
  onPaid,
}: {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onPaid: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    paid_amount: '',
    paid_at: new Date().toISOString().split('T')[0],
    method: 'bank_transfer',
  })

  useEffect(() => {
    if (open && invoice) {
      setForm({
        paid_amount: String(invoice.total),
        paid_at: new Date().toISOString().split('T')[0],
        method: 'bank_transfer',
      })
    }
  }, [open, invoice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice) return

    const amount = parseFloat(form.paid_amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid paid amount')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setLoading(false)
      return
    }

    // Update invoice
    const { error: invError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_amount: amount,
        paid_at: new Date(form.paid_at).toISOString(),
      })
      .eq('id', invoice.id)

    if (invError) {
      toast.error(invError.message)
      setLoading(false)
      return
    }

    // Create payment record
    const { error: payError } = await supabase.from('payments').insert({
      user_id: user.id,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount,
      method: form.method,
      paid_at: new Date(form.paid_at).toISOString(),
    })

    setLoading(false)
    if (payError) {
      toast.error(payError.message)
    } else {
      toast.success('Invoice marked as paid!')
      onPaid()
      onClose()
    }
  }

  if (!invoice) return null

  return (
    <Modal open={open} onClose={onClose} title={`Mark as Paid — ${invoice.invoice_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-card-border bg-background p-3">
          <p className="text-sm text-muted">Total Invoice Amount</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(invoice.total)}</p>
        </div>

        <Input
          id="paid-amount"
          label="Amount Received *"
          type="number"
          step="0.01"
          min="0"
          value={form.paid_amount}
          onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
          required
        />

        <Input
          id="paid-date"
          label="Payment Date"
          type="date"
          value={form.paid_at}
          onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Payment Method</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" loading={loading}>
            <CheckCircle className="h-4 w-4" /> Mark as Paid
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Main Page ----------

export default function InvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPaidModal, setShowPaidModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const fetchInvoices = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    let query = supabase
      .from('invoices')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (search.trim()) {
      query = query.or(
        `invoice_number.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%`
      )
    }

    const { data } = await query
    if (data) setInvoices(data as unknown as Invoice[])
    setLoading(false)
  }

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  // Stats
  const totalCount = invoices.length
  const draftCount = invoices.filter((i) => i.status === 'draft').length
  const sentCount = invoices.filter((i) => i.status === 'sent').length
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length
  const paidThisMonth = invoices.filter((i) => {
    if (i.status !== 'paid' || !i.paid_at) return false
    const d = new Date(i.paid_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const paidThisMonthTotal = paidThisMonth.reduce((sum, i) => sum + Number(i.paid_amount || i.total), 0)
  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.paid_amount || i.total), 0)

  const handleMarkPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPaidModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted">Create and manage invoices</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted">Total</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">{totalCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-muted">Draft</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">{draftCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted">Sent</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">{sentCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted">Paid (Month)</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-emerald-400">{formatCurrency(paidThisMonthTotal)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-400" />
            <span className="text-xs text-muted">Overdue</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-red-400">{overdueCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-secondary" />
            <span className="text-xs text-muted">Total Revenue</span>
          </div>
          <p className="mt-1.5 text-lg font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search invoice # or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchInvoices() }}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground hover:bg-card'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden sm:table-cell">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">Loading...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-8 w-8 text-muted/50" />
                    <p>No invoices found</p>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-card-hover">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted truncate max-w-[120px]">
                    {inv.clients?.name || 'Unknown'}
                  </td>
                  <td className="hidden px-4 py-3 text-sm font-semibold text-foreground sm:table-cell">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted md:table-cell">
                    {inv.due_date ? formatDate(inv.due_date) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[inv.status] || 'gray'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === 'sent' || inv.status === 'overdue' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkPaid(inv)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Paid
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddInvoiceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchInvoices}
      />
      <MarkPaidModal
        open={showPaidModal}
        onClose={() => {
          setShowPaidModal(false)
          setSelectedInvoice(null)
        }}
        invoice={selectedInvoice}
        onPaid={fetchInvoices}
      />
    </div>
  )
}

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import type { Client } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  rate: number
  total: number
}

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <EditQuoteForm id={params} />
    </Suspense>
  )
}

function EditQuoteForm({ id }: { id: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [quoteId, setQuoteId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [includeGst, setIncludeGst] = useState(true)
  const [laborItems, setLaborItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit: 'hours', rate: 0, total: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { id: qId } = await id
      setQuoteId(qId)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch clients
      const { data: clientsData } = await supabase.from('clients').select('*').order('name')
      if (clientsData) setClients(clientsData as Client[])

      // Fetch quote
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', qId)
        .eq('user_id', user.id)
        .single()

      if (quote) {
        setClientId(quote.client_id || '')
        setTitle(quote.title || '')
        setNotes(quote.notes || '')
        setIncludeGst(quote.gst ? quote.gst > 0 : true)
        if (quote.items && quote.items.length > 0) {
          setLaborItems(
            quote.items.map((item: any, i: number) => ({
              id: `item-${i}`,
              description: item.description || '',
              quantity: item.quantity || 1,
              unit: item.unit || 'hours',
              rate: item.rate || 0,
              total: (item.quantity || 1) * (item.rate || 0),
            }))
          )
        }
      }
      setLoading(false)
    }
    init()
  }, [id])

  const addLaborItem = () => {
    setLaborItems([...laborItems, { id: String(Date.now()), description: '', quantity: 1, unit: 'hours', rate: 0, total: 0 }])
  }

  const removeLaborItem = (id: string) => {
    if (laborItems.length <= 1) return
    setLaborItems(laborItems.filter((item) => item.id !== id))
  }

  const updateLaborItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLaborItems(laborItems.map((item) => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'rate') {
        updated.total = (updated.quantity || 0) * (updated.rate || 0)
      }
      return updated
    }))
  }

  const subtotal = laborItems.reduce((sum, item) => sum + item.total, 0)
  const gstAmount = includeGst ? Math.round(subtotal * 0.1 * 100) / 100 : 0
  const total = subtotal + gstAmount

  const handleSave = async () => {
    if (!clientId) { toast.error('Please select a client'); return }
    if (!title.trim()) { toast.error('Please enter a quote title'); return }

    setSaving(true)
    const { error } = await supabase
      .from('quotes')
      .update({
        client_id: clientId,
        title: title.trim(),
        items: laborItems.map(({ id, ...rest }) => rest),
        subtotal,
        gst: gstAmount,
        total,
        notes,
      })
      .eq('id', quoteId)

    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Quote updated!')
      router.push(`/quotes/${quoteId}`)
    }
  }

  if (loading) return <p className="text-center py-12 text-muted">Loading...</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Edit Quote</h1>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Card className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Client *</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Select a client...</option>
            {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <Input id="edit-title" label="Quote Title *" placeholder="e.g. Kitchen Renovation" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Items</h2>
          <Button variant="ghost" size="sm" onClick={addLaborItem}><Plus className="h-4 w-4" /> Add Item</Button>
        </div>
        <div className="space-y-3">
          {laborItems.map((item) => (
            <div key={item.id} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 text-xs text-muted">Description</label>
                <input value={item.description} onChange={(e) => updateLaborItem(item.id, 'description', e.target.value)}
                  placeholder="Description of work"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="w-16">
                <label className="mb-1 text-xs text-muted">Qty</label>
                <input type="number" min="0" step="0.5" value={item.quantity}
                  onChange={(e) => updateLaborItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="w-20">
                <label className="mb-1 text-xs text-muted">Unit</label>
                <select value={item.unit} onChange={(e) => updateLaborItem(item.id, 'unit', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="sqm">SQM</option>
                  <option value="each">Each</option>
                </select>
              </div>
              <div className="w-24">
                <label className="mb-1 text-xs text-muted">Rate ($)</label>
                <input type="number" min="0" step="0.01" value={item.rate}
                  onChange={(e) => updateLaborItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="w-24">
                <label className="mb-1 text-xs text-muted">Total</label>
                <div className="rounded-md bg-card-hover px-2.5 py-1.5 text-sm font-medium text-foreground">${item.total.toFixed(2)}</div>
              </div>
              <button onClick={() => removeLaborItem(item.id)}
                className="mb-0.5 rounded-md p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="space-y-2 border-b border-border pb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-foreground">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <label className="text-muted cursor-pointer" onClick={() => setIncludeGst(!includeGst)}>GST (10%)</label>
              <button type="button" onClick={() => setIncludeGst(!includeGst)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${includeGst ? 'bg-primary' : 'bg-border'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${includeGst ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
            <span className="text-foreground">${gstAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-between pt-4 text-lg font-bold">
          <span className="text-foreground">Total {includeGst ? '(incl. GST)' : '(excl. GST)'}</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
      </Card>

      <Card>
        <label className="mb-1.5 block text-sm font-medium text-muted">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Additional notes..." />
      </Card>
    </div>
  )
}

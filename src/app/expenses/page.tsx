'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import {
  Receipt,
  Plus,
  Upload,
  Search,
  TrendingUp,
  X,
  Camera,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

// ---------- types ----------

type Expense = {
  id: string
  user_id: string
  vendor: string
  amount: number
  category: string
  description: string | null
  receipt_url: string | null
  created_at: string
}

const CATEGORIES = [
  'All',
  'Materials',
  'Tools',
  'Fuel',
  'Vehicle',
  'Insurance',
  'Office',
  'Subcontractor',
  'Other',
] as const

type Category = (typeof CATEGORIES)[number]

const CATEGORY_BADGE_COLORS: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = {
  Materials: 'blue',
  Tools: 'amber',
  Fuel: 'amber',
  Vehicle: 'gray',
  Insurance: 'red',
  Office: 'green',
  Subcontractor: 'blue',
  Other: 'gray',
}

// ---------- Add Expense Modal ----------

function AddExpenseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    vendor: '',
    amount: '',
    category: 'Materials',
    description: '',
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.')
      return
    }

    setReceiptFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const removeReceipt = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setReceiptFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vendor.trim() || !form.amount) {
      toast.error('Vendor and amount are required')
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

    // Upload receipt image if selected
    let receiptUrl: string | null = null
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile)

      if (uploadError) {
        toast.error('Failed to upload receipt: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)
      receiptUrl = urlData?.publicUrl || null
    }

    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      vendor: form.vendor.trim(),
      amount,
      category: form.category,
      description: form.description.trim() || null,
      receipt_url: receiptUrl,
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Expense added!')
      // Reset form
      setForm({
        vendor: '',
        amount: '',
        category: 'Materials',
        description: '',
      })
      removeReceipt()
      onCreated()
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Expense" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="exp-vendor"
            label="Vendor *"
            placeholder="e.g. Bunnings"
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            required
          />
          <Input
            id="exp-amount"
            label="Amount ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Receipt upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Receipt Image</label>
          {previewUrl ? (
            <div className="relative rounded-lg border border-border overflow-hidden">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-48 w-full object-contain bg-black/20"
              />
              <button
                type="button"
                onClick={removeReceipt}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-sm text-muted hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Upload className="h-5 w-5" />
              Click to upload receipt image
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Scan Receipt Modal ----------

function ScanReceiptModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.')
      return
    }
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error('Please select a receipt image first')
      return
    }

    setScanning(true)
    const formData = new FormData()
    formData.append('receipt', selectedFile)

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to scan receipt')
      }

      const data = await res.json()
      toast.success('Receipt scanned successfully!')

      // Auto-fill data would go through the Add Expense modal
      // For now, we trigger refresh and close
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan receipt')
    } finally {
      setScanning(false)
    }
  }

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      handleRemove()
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Scan Receipt">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Take a photo or upload a receipt image to automatically extract expense details.
        </p>

        {previewUrl ? (
          <div className="relative rounded-lg border border-border overflow-hidden">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-64 w-full object-contain bg-black/20"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-10 text-sm text-muted hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Camera className="h-8 w-8" />
            <span>Click to upload or capture receipt</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={scanning}
            disabled={!selectedFile}
            onClick={handleScan}
          >
            <Upload className="h-4 w-4" />
            {scanning ? 'Scanning...' : 'Scan Receipt'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ---------- Main Page ----------

export default function ExpensesPage() {
  const supabase = createClient()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category>('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)

  const fetchExpenses = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Category filter
    if (categoryFilter !== 'All') {
      query = query.eq('category', categoryFilter)
    }

    // Search filter
    if (search.trim()) {
      query = query.or(
        `vendor.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,category.ilike.%${search.trim()}%`
      )
    }

    const { data } = await query
    if (data) setExpenses(data as unknown as Expense[])
    setLoading(false)
  }

  useEffect(() => {
    fetchExpenses()
  }, [categoryFilter])

  // Calculate totals
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted">Track and manage your business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowScanModal(true)}>
            <Receipt className="h-4 w-4" /> Scan Receipt
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 max-w-sm">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Expenses</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search vendor, description, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchExpenses()
            }}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Category filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as Category)}
              className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {categoryFilter !== 'All' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter('All')
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  Loading...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-8 w-8 text-muted/50" />
                    <p>No expenses found</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus className="h-4 w-4" /> Add your first expense
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="transition-colors hover:bg-card-hover"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {expense.vendor}
                      </p>
                      {expense.description && (
                        <p className="mt-0.5 text-xs text-muted line-clamp-1">
                          {expense.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge
                      variant={
                        CATEGORY_BADGE_COLORS[expense.category] || 'gray'
                      }
                    >
                      {expense.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(expense.amount)}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Export hint */}
      {expenses.length > 0 && (
        <p className="text-center text-xs text-muted">
          Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modals */}
      <AddExpenseModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchExpenses}
      />
      <ScanReceiptModal
        open={showScanModal}
        onClose={() => setShowScanModal(false)}
        onCreated={fetchExpenses}
      />
    </div>
  )
}

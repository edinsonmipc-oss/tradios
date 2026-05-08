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
  Package,
  Plus,
  Search,
  AlertTriangle,
  Minus,
  ShoppingCart,
  TrendingUp,
  Edit3,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ---------- types ----------

type InventoryItem = {
  id: string
  user_id: string
  name: string
  category: string
  quantity: number
  unit: string
  unit_cost: number
  supplier: string | null
  min_stock: number
  notes: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  'Materials',
  'Tools',
  'Fasteners',
  'Paint',
  'Plumbing',
  'Electrical',
  'General',
  'Other',
] as const

const UNITS = ['each', 'm', 'kg', 'L', 'm²', 'box', 'pair', 'roll'] as const

const CATEGORY_VARIANTS: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = {
  Materials: 'blue',
  Tools: 'green',
  Fasteners: 'amber',
  Paint: 'red',
  Plumbing: 'gray',
  Electrical: 'amber',
  General: 'gray',
  Other: 'gray',
}

// ---------- Inventory Modal ----------

function InventoryModal({
  open,
  onClose,
  onSaved,
  item,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  item?: InventoryItem | null
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const isEditing = !!item

  const [form, setForm] = useState({
    name: '',
    category: 'General',
    quantity: 0,
    unit: 'each',
    unit_cost: 0,
    supplier: '',
    min_stock: 0,
    notes: '',
  })

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          supplier: item.supplier || '',
          min_stock: item.min_stock,
          notes: item.notes || '',
        })
      } else {
        setForm({
          name: '',
          category: 'General',
          quantity: 0,
          unit: 'each',
          unit_cost: 0,
          supplier: '',
          min_stock: 0,
          notes: '',
        })
      }
    }
  }, [open, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Item name is required')
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
      user_id: user.id,
      name: form.name.trim(),
      category: form.category,
      quantity: form.quantity,
      unit: form.unit,
      unit_cost: form.unit_cost,
      supplier: form.supplier.trim() || null,
      min_stock: form.min_stock,
      notes: form.notes.trim() || null,
    }

    if (isEditing) {
      const { error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', item!.id)

      setLoading(false)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Item updated!')
        onSaved()
        onClose()
      }
    } else {
      const { error } = await supabase
        .from('inventory_items')
        .insert(payload)

      setLoading(false)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Item added to inventory!')
        onSaved()
        onClose()
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Item' : 'Add Item'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input
          id="item-name"
          label="Item Name *"
          placeholder="e.g. 12mm Plywood Sheet"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="item-quantity"
            label="Quantity"
            type="number"
            step="0.01"
            min="0"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
          />
          <Input
            id="item-unit-cost"
            label="Unit Cost ($)"
            type="number"
            step="0.01"
            min="0"
            value={form.unit_cost}
            onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="item-supplier"
            label="Supplier"
            placeholder="e.g. Bunnings"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
          <Input
            id="item-min-stock"
            label="Min Stock Level"
            type="number"
            step="0.01"
            min="0"
            value={form.min_stock}
            onChange={(e) => setForm({ ...form, min_stock: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Storage location, reorder info, etc..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Plus className="h-4 w-4" />
            {isEditing ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- Inventory Card ----------

function InventoryCard({
  item,
  onEdit,
  onDeleted,
  onAdjustStock,
}: {
  item: InventoryItem
  onEdit: (i: InventoryItem) => void
  onDeleted: (i: InventoryItem) => void
  onAdjustStock: (i: InventoryItem, delta: number) => void
}) {
  const isLowStock = item.min_stock > 0 && item.quantity <= item.min_stock
  const stockValue = item.quantity * item.unit_cost

  return (
    <div
      className={`rounded-xl border p-5 transition-all hover:shadow-md ${
        isLowStock
          ? 'border-red-500/30 bg-red-500/[0.04]'
          : 'border-card-border bg-card card-glow hover:border-primary/30'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`rounded-lg p-2 ${
            isLowStock ? 'bg-red-500/10' : 'bg-primary/10'
          }`}>
            <Package className={`h-4 w-4 ${
              isLowStock ? 'text-red-400' : 'text-primary'
            }`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {item.name}
            </h3>
            {item.supplier && (
              <p className="text-xs text-muted truncate">{item.supplier}</p>
            )}
          </div>
        </div>
        <Badge variant={CATEGORY_VARIANTS[item.category] || 'gray'}>
          {item.category}
        </Badge>
      </div>

      {/* Stock Level */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-foreground">
            {item.quantity}
          </span>
          <span className="ml-1 text-sm text-muted">{item.unit}</span>
        </div>
        {isLowStock && (
          <Badge variant="red">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Low Stock
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="mb-4 space-y-1 text-xs text-muted">
        <div className="flex justify-between">
          <span>Unit Cost</span>
          <span className="text-foreground">{formatCurrency(item.unit_cost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Stock Value</span>
          <span className="text-foreground font-medium">{formatCurrency(stockValue)}</span>
        </div>
        {item.min_stock > 0 && (
          <div className="flex justify-between">
            <span>Min Stock</span>
            <span className="text-foreground">{item.min_stock} {item.unit}</span>
          </div>
        )}
        {item.notes && (
          <p className="pt-1 text-muted/70 italic line-clamp-1">{item.notes}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-3 flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAdjustStock(item, 1)}
          title="Add 1"
        >
          +1
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAdjustStock(item, 5)}
          title="Add 5"
        >
          +5
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAdjustStock(item, 10)}
          title="Add 10"
        >
          +10
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const remove = Math.min(1, item.quantity)
            if (remove > 0) onAdjustStock(item, -remove)
          }}
          title="Remove 1"
          className="ml-auto"
        >
          <Minus className="h-3 w-3" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="flex-1">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDeleted(item)} className="flex-1 text-red-400 hover:text-red-300">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function InventoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (data) setItems(data as InventoryItem[])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', item.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`${item.name} deleted`)
      fetchItems()
    }
  }

  const handleAdjustStock = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta)
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity: newQty })
      .eq('id', item.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(delta > 0 ? `Added ${delta} ${item.unit}` : `Removed ${Math.abs(delta)} ${item.unit}`)
      fetchItems()
    }
  }

  // Filters
  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Stats
  const totalItems = items.length
  const lowStockCount = items.filter((i) => i.min_stock > 0 && i.quantity <= i.min_stock).length
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)
  const categoriesCount = new Set(items.map((i) => i.category)).size

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted">Manage your materials, tools, and supplies</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true) }}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-card-border bg-card p-4 card-glow">
          <div className="flex items-center gap-2 text-muted mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalItems}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4 card-glow">
          <div className="flex items-center gap-2 text-muted mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium">Low Stock</span>
          </div>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-400' : 'text-foreground'}`}>
            {lowStockCount}
          </p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4 card-glow">
          <div className="flex items-center gap-2 text-muted mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4 card-glow">
          <div className="flex items-center gap-2 text-muted mb-1">
            <ShoppingCart className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium">Categories</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{categoriesCount}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-auto"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-center text-sm text-muted py-12">Loading...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-card-border bg-card py-16">
          <Package className="mb-3 h-12 w-12 text-muted/50" />
          <p className="text-sm text-muted mb-1">No inventory items yet</p>
          <p className="text-xs text-muted/60 mb-4">Start by adding your materials, tools, and supplies</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Add your first item
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-card-border bg-card py-16">
          <Search className="mb-3 h-10 w-10 text-muted/50" />
          <p className="text-sm text-muted">No items match your search</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setSearch(''); setCategoryFilter('all') }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">
            Showing {filtered.length} of {items.length} items
            {lowStockCount > 0 && (
              <span className="ml-2 text-red-400">• {lowStockCount} low stock</span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onEdit={(i) => { setEditItem(i); setShowModal(true) }}
                onDeleted={handleDelete}
                onAdjustStock={handleAdjustStock}
              />
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <InventoryModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditItem(null) }}
        onSaved={fetchItems}
        item={editItem}
      />
    </div>
  )
}

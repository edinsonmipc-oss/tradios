'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  PiggyBank,
  Download,
  BarChart3,
  PieChart,
} from 'lucide-react'

// ---------- types ----------

type Period = 'this_month' | 'this_quarter' | 'this_year' | 'all_time'

type RecentTransaction = {
  id: string
  type: 'revenue' | 'expense'
  description: string
  amount: number
  date: string
  category?: string
}

type MonthlySummary = {
  month: string
  year: number
  monthIndex: number
  revenue: number
  expenses: number
}

type CategoryBreakdown = {
  category: string
  total: number
}

// ---------- helpers ----------

const PERIOD_LABELS: Record<Period, string> = {
  this_month: 'This Month',
  this_quarter: 'This Quarter',
  this_year: 'This Year',
  all_time: 'All Time',
}

function getPeriodDates(period: Period): { gte: string | null; lt: string | null } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'this_month': {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 1)
      return { gte: start.toISOString(), lt: end.toISOString() }
    }
    case 'this_quarter': {
      const quarterStartMonth = Math.floor(month / 3) * 3
      const start = new Date(year, quarterStartMonth, 1)
      const end = new Date(year, quarterStartMonth + 3, 1)
      return { gte: start.toISOString(), lt: end.toISOString() }
    }
    case 'this_year': {
      const start = new Date(year, 0, 1)
      const end = new Date(year + 1, 0, 1)
      return { gte: start.toISOString(), lt: end.toISOString() }
    }
    case 'all_time':
    default:
      return { gte: null, lt: null }
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  Materials: '#3b82f6',
  Tools: '#f59e0b',
  Fuel: '#ef4444',
  Vehicle: '#8b5cf6',
  Insurance: '#ec4899',
  Office: '#10b981',
  Subcontractor: '#06b6d4',
  Other: '#64748b',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ---------- Page Component ----------

export default function AccountingPage() {
  const supabase = createClient()
  const [period, setPeriod] = useState<Period>('this_month')
  const [loading, setLoading] = useState(true)

  // Aggregated data
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [revenueGst, setRevenueGst] = useState(0)
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [expenseGst, setExpenseGst] = useState(0)

  // Detail data
  const [acceptedQuotes, setAcceptedQuotes] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])

  const netProfit = revenueTotal - expenseTotal
  const estTax = netProfit > 0 ? netProfit * 0.3 : 0

  // ---------- data fetching ----------

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { gte, lt } = getPeriodDates(period)

    // Build base queries
    let quoteQuery = supabase
      .from('quotes')
      .select('id, total, created_at, title, quote_number, clients(name)')
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    let expenseQuery = supabase
      .from('expenses')
      .select('id, amount, category, description, vendor, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply date filters
    if (gte) {
      quoteQuery = quoteQuery.gte('created_at', gte)
      expenseQuery = expenseQuery.gte('created_at', gte)
    }
    if (lt) {
      quoteQuery = quoteQuery.lt('created_at', lt)
      expenseQuery = expenseQuery.lt('created_at', lt)
    }

    const [quotesRes, expensesRes] = await Promise.all([
      quoteQuery,
      expenseQuery,
    ])

    const quotes = quotesRes.data || []
    const expenses = expensesRes.data || []

    setAcceptedQuotes(quotes)
    setAllExpenses(expenses)

    // Compute summaries
    const revTotal = quotes.reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0)
    const revGst = 0

    const expTotal = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
    const expGst = 0

    setRevenueTotal(revTotal)
    setRevenueGst(revGst)
    setExpenseTotal(expTotal)
    setExpenseGst(expGst)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [period])

  // ---------- derived data ----------

  const recentTransactions: RecentTransaction[] = useMemo(() => {
    const revenueTxns: RecentTransaction[] = acceptedQuotes.map((q: any) => ({
      id: `rev-${q.id}`,
      type: 'revenue' as const,
      description: q.title || q.quote_number || 'Quote',
      amount: Number(q.total) || 0,
      date: q.created_at,
    }))

    const expenseTxns: RecentTransaction[] = allExpenses.map((e: any) => ({
      id: `exp-${e.id}`,
      type: 'expense' as const,
      description: e.description || e.vendor || 'Expense',
      amount: Number(e.amount) || 0,
      date: e.created_at,
      category: e.category,
    }))

    const merged = [...revenueTxns, ...expenseTxns]
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return merged.slice(0, 20)
  }, [acceptedQuotes, allExpenses])

  const categoryBreakdown: CategoryBreakdown[] = useMemo(() => {
    const map: Record<string, number> = {}
    allExpenses.forEach((e: any) => {
      const cat = e.category || 'Other'
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0)
    })
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [allExpenses])

  const monthlySummary: MonthlySummary[] = useMemo(() => {
    const map: Record<string, MonthlySummary> = {}

    acceptedQuotes.forEach((q: any) => {
      const d = new Date(q.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map[key]) {
        map[key] = {
          month: MONTH_NAMES[d.getMonth()],
          year: d.getFullYear(),
          monthIndex: d.getMonth(),
          revenue: 0,
          expenses: 0,
        }
      }
      map[key].revenue += Number(q.total) || 0
    })

    allExpenses.forEach((e: any) => {
      const dateStr = e.created_at
      const d = new Date(dateStr)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map[key]) {
        map[key] = {
          month: MONTH_NAMES[d.getMonth()],
          year: d.getFullYear(),
          monthIndex: d.getMonth(),
          revenue: 0,
          expenses: 0,
        }
      }
      map[key].expenses += Number(e.amount) || 0
    })

    return Object.values(map).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.monthIndex - b.monthIndex
    })
  }, [acceptedQuotes, allExpenses])

  // ---------- CSV Export ----------

  const downloadCSV = () => {
    const rows = [['Type', 'Description', 'Amount', 'Date', 'Details']]
    recentTransactions.forEach((t) => {
      const details =
        t.type === 'revenue' ? '' : t.category || ''
      rows.push([t.type, t.description, t.amount.toFixed(2), formatDate(t.date), details])
    })

    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounting-${PERIOD_LABELS[period].toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  // ---------- pie chart conic gradient ----------

  const pieGradient = useMemo(() => {
    if (categoryBreakdown.length === 0) return ''
    const total = categoryBreakdown.reduce((s, c) => s + c.total, 0)
    let cumulative = 0
    const stops = categoryBreakdown.map((cat) => {
      const pct = (cat.total / total) * 100
      const start = cumulative
      cumulative += pct
      const color = CATEGORY_COLORS[cat.category] || '#64748b'
      return `${color} ${start}% ${cumulative}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown])

  // ---------- CSS bar chart max ----------

  const barMax = Math.max(revenueTotal, expenseTotal, 1)

  // ---------- render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounting &amp; P&amp;L</h1>
          <p className="mt-1 text-sm text-muted">Track revenue, expenses, and profit</p>
        </div>
        <div className="flex items-center gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted hover:text-foreground border border-border'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Total Revenue</p>
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {loading ? '...' : formatCurrency(revenueTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Total Expenses</p>
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-red-400">
              {loading ? '...' : formatCurrency(expenseTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Net Profit</p>
              <DollarSign className="h-5 w-5 text-foreground" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold ${
                netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {loading ? '...' : formatCurrency(netProfit)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {netProfit >= 0 ? 'Profitable' : 'Loss'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Est. Tax (30%)</p>
              <PiggyBank className="h-5 w-5 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {loading ? '...' : netProfit > 0 ? formatCurrency(estTax) : formatCurrency(0)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {netProfit > 0 ? 'Set aside for tax' : 'No tax due'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Chart + Pie Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Revenue vs Expenses
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted">
                Loading...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Revenue bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-emerald-400 font-medium">Revenue</span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(revenueTotal)}
                    </span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-card border border-border">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(revenueTotal / barMax) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Expense bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-red-400 font-medium">Expenses</span>
                    <span className="text-foreground font-semibold">
                      {formatCurrency(expenseTotal)}
                    </span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-card border border-border">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${(expenseTotal / barMax) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Expense Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Expenses by Category
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted">
                Loading...
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted">
                No expenses in this period
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                {/* Pie */}
                <div
                  className="h-32 w-32 shrink-0 rounded-full border-2 border-border"
                  style={{ background: pieGradient }}
                />
                {/* Legend */}
                <div className="flex-1 space-y-1.5">
                  {categoryBreakdown.map((cat) => {
                    const total = categoryBreakdown.reduce((s, c) => s + c.total, 0)
                    const pct = ((cat.total / total) * 100).toFixed(1)
                    return (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748b' }}
                          />
                          <span className="text-foreground">{cat.category}</span>
                        </div>
                        <span className="text-muted">
                          {formatCurrency(cat.total)} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month-by-Month Table */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-foreground">
            Monthly Summary
          </h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted">
              Loading...
            </div>
          ) : monthlySummary.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted">
              No data for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-medium text-muted">Month</th>
                    <th className="py-2 px-4 text-right font-medium text-muted">Revenue</th>
                    <th className="py-2 px-4 text-right font-medium text-muted">Expenses</th>
                    <th className="py-2 pl-4 text-right font-medium text-muted">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((m) => {
                    const profit = m.revenue - m.expenses
                    return (
                      <tr key={`${m.year}-${m.monthIndex}`} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 text-foreground font-medium">
                          {m.month} {m.year}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-400">
                          {formatCurrency(m.revenue)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-red-400">
                          {formatCurrency(m.expenses)}
                        </td>
                        <td
                          className={`py-2.5 pl-4 text-right font-semibold ${
                            profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(profit)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td className="pt-2.5 pr-4 font-semibold text-foreground">Total</td>
                    <td className="pt-2.5 px-4 text-right font-semibold text-emerald-400">
                      {formatCurrency(monthlySummary.reduce((s, m) => s + m.revenue, 0))}
                    </td>
                    <td className="pt-2.5 px-4 text-right font-semibold text-red-400">
                      {formatCurrency(monthlySummary.reduce((s, m) => s + m.expenses, 0))}
                    </td>
                    <td
                      className={`pt-2.5 pl-4 text-right font-bold ${
                        netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Recent Transactions</h3>
            <Button variant="secondary" size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted">
              Loading...
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted">
              No transactions in this period
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        txn.type === 'revenue'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {txn.type === 'revenue' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {txn.description}
                      </p>
                      <p className="text-xs text-muted">
                        {txn.type === 'revenue' ? 'Client' : txn.category || 'Expense'}
                        {' · '}
                        {formatDate(txn.date)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        txn.type === 'revenue' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {txn.type === 'revenue' ? '+' : '-'}
                      {formatCurrency(txn.amount)}
                    </span>
                    <div className="mt-0.5">
                      <Badge
                        variant={txn.type === 'revenue' ? 'green' : 'red'}
                        className="text-[10px] uppercase"
                      >
                        {txn.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Shield,
  Bell,
  FileText,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ---------- types ----------

type CalendarEvent = {
  id: string
  date: string
  type: 'visit' | 'follow_up' | 'insurance' | 'invoice'
  title: string
  subtitle: string
  status?: string
  priority?: string
}

type DayEvents = {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

type VisitRow = {
  id: string
  scheduled_date: string
  title: string
  status: string
  clients?: { name: string } | null
}

type FollowUpRow = {
  id: string
  due_date: string
  title: string
  priority: string
  status: string
  clients?: { name: string } | null
}

type InsuranceRow = {
  id: string
  expiry_date: string
  type: string
  provider: string | null
  status: string
}

type InvoiceRow = {
  id: string
  due_date: string
  title: string
  invoice_number: string
  total: number
  status: string
  clients?: { name: string } | null
}

// ---------- helpers ----------

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function getDayEvents(dateStr: string, events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => e.date === dateStr)
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ---------- Event Badge Dots ----------

function EventDot({ event }: { event: CalendarEvent }) {
  const colorMap: Record<string, string> = {
    visit: 'bg-blue-500',
    follow_up: event.priority === 'high' || event.priority === 'urgent' ? 'bg-red-500' : 'bg-amber-500',
    insurance: 'bg-purple-500',
    invoice: event.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500',
  }

  const iconMap: Record<string, React.ReactNode> = {
    visit: <Users className="h-2.5 w-2.5 text-white" />,
    follow_up: <Bell className="h-2.5 w-2.5 text-white" />,
    insurance: <Shield className="h-2.5 w-2.5 text-white" />,
    invoice: <FileText className="h-2.5 w-2.5 text-white" />,
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full p-0.5 ${colorMap[event.type] || 'bg-gray-500'}`}
      title={`${event.type.replace('_', ' ')}: ${event.title}`}
    >
      {iconMap[event.type] || <span className="h-2 w-2" />}
    </span>
  )
}

// ---------- Day Events Modal ----------

function DayEventsModal({
  open,
  onClose,
  date,
  events,
}: {
  open: boolean
  onClose: () => void
  date: string
  events: CalendarEvent[]
}) {
  return (
    <Modal open={open} onClose={onClose} title={formatDate(date)} className="max-w-md">
      {events.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">No events on this day</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {events.map((event) => (
            <div
              key={`${event.type}-${event.id}`}
              className="rounded-lg border border-card-border bg-background p-3"
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  {event.type === 'visit' && <Users className="h-4 w-4 text-blue-400" />}
                  {event.type === 'follow_up' && <Bell className={`h-4 w-4 ${event.priority === 'high' || event.priority === 'urgent' ? 'text-red-400' : 'text-amber-400'}`} />}
                  {event.type === 'insurance' && <Shield className="h-4 w-4 text-purple-400" />}
                  {event.type === 'invoice' && <FileText className={`h-4 w-4 ${event.status === 'overdue' ? 'text-red-400' : 'text-amber-400'}`} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-muted truncate">{event.subtitle}</p>
                </div>
                <Badge
                  variant={
                    event.type === 'visit' ? 'blue'
                    : event.type === 'follow_up' && (event.priority === 'high' || event.priority === 'urgent') ? 'red'
                    : event.type === 'follow_up' ? 'amber'
                    : event.type === 'insurance' ? 'blue'
                    : event.status === 'overdue' ? 'red'
                    : 'amber'
                  }
                  className="flex-shrink-0"
                >
                  {event.type === 'visit' ? 'Visit'
                  : event.type === 'follow_up' ? 'Follow-up'
                  : event.type === 'insurance' ? 'Renewal'
                  : 'Invoice'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ---------- Calendar Grid ----------

function CalendarGrid({
  year,
  month,
  events,
  onDayClick,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  onDayClick: (date: string, dayEvents: CalendarEvent[]) => void
}) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()

  // Previous month days (for padding)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

  const cells: DayEvents[] = []

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const dateKey = formatDateKey(prevYear, prevMonth, day)
    cells.push({
      date: dateKey,
      day,
      isCurrentMonth: false,
      isToday: false,
      events: getDayEvents(dateKey, events),
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day)
    cells.push({
      date: dateKey,
      day,
      isCurrentMonth: true,
      isToday: isToday(new Date(year, month, day)),
      events: getDayEvents(dateKey, events),
    })
  }

  // Next month padding (fill to 42 cells = 6 rows)
  const remaining = 42 - cells.length
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  for (let day = 1; day <= remaining; day++) {
    const dateKey = formatDateKey(nextYear, nextMonth, day)
    cells.push({
      date: dateKey,
      day,
      isCurrentMonth: false,
      isToday: false,
      events: getDayEvents(dateKey, events),
    })
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-semibold text-muted"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell) => (
          <button
            key={cell.date}
            onClick={() => onDayClick(cell.date, cell.events)}
            className={`
              flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-all min-h-[64px] sm:min-h-[80px]
              ${cell.isCurrentMonth ? 'text-foreground' : 'text-muted-dark'}
              ${cell.isToday ? 'ring-2 ring-primary/60 bg-primary/5' : ''}
              ${cell.events.length > 0 ? 'cursor-pointer hover:bg-card-hover' : 'cursor-default'}
              ${!cell.isCurrentMonth ? 'opacity-40' : ''}
              focus:outline-none focus:ring-2 focus:ring-primary/40
            `}
          >
            <span className={`text-xs font-medium ${
              cell.isToday ? 'text-primary' : ''
            }`}>
              {cell.day}
            </span>
            {cell.events.length > 0 && (
              <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
                {cell.events.slice(0, 4).map((event) => (
                  <EventDot key={`${event.type}-${event.id}`} event={event} />
                ))}
                {cell.events.length > 4 && (
                  <span className="text-[10px] text-muted font-medium">
                    +{cell.events.length - 4}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function CalendarPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{ date: string; events: CalendarEvent[] } | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const fetchEvents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Month range for filtering
    const startDate = formatDateKey(year, month, 1)
    const lastDay = getDaysInMonth(year, month)
    const endDate = formatDateKey(year, month, lastDay)

    // Also fetch from adjacent months to fill padding cells
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year

    const rangeStart = formatDateKey(prevYear, prevMonth, 1)
    const rangeEnd = formatDateKey(nextYear, nextMonth, getDaysInMonth(nextYear, nextMonth))

    try {
      const allEvents: CalendarEvent[] = []

      // 1. Fetch Visits
      const { data: visits } = await supabase
        .from('visits')
        .select('id, scheduled_date, title, status, clients(name)')
        .eq('user_id', user.id)
        .gte('scheduled_date', rangeStart)
        .lte('scheduled_date', rangeEnd)
        .not('status', 'eq', 'cancelled')
        .order('scheduled_date')

      if (visits) {
        ;(visits as unknown as VisitRow[]).forEach((v) => {
          if (v.scheduled_date) {
            const d = v.scheduled_date.split('T')[0] || v.scheduled_date
            allEvents.push({
              id: v.id,
              date: d,
              type: 'visit',
              title: v.title || 'Site Visit',
              subtitle: v.clients?.name || 'No client',
              status: v.status,
            })
          }
        })
      }

      // 2. Fetch Follow-ups
      const { data: followUps } = await supabase
        .from('follow_ups')
        .select('id, due_date, title, priority, status, clients(name)')
        .eq('user_id', user.id)
        .gte('due_date', rangeStart)
        .lte('due_date', rangeEnd)
        .order('due_date')

      if (followUps) {
        ;(followUps as unknown as FollowUpRow[]).forEach((f) => {
          if (f.due_date && f.status !== 'completed' && f.status !== 'cancelled') {
            const d = f.due_date.split('T')[0] || f.due_date
            allEvents.push({
              id: f.id,
              date: d,
              type: 'follow_up',
              title: f.title,
              subtitle: f.clients?.name || 'No client',
              priority: f.priority,
              status: f.status,
            })
          }
        })
      }

      // 3. Fetch Insurance renewals (expiry dates in range)
      const { data: insurances } = await supabase
        .from('insurances')
        .select('id, expiry_date, type, provider, status')
        .eq('user_id', user.id)
        .gte('expiry_date', rangeStart)
        .lte('expiry_date', rangeEnd)
        .in('status', ['active'])
        .order('expiry_date')

      if (insurances) {
        ;(insurances as unknown as InsuranceRow[]).forEach((ins) => {
          if (ins.expiry_date) {
            const d = ins.expiry_date.split('T')[0] || ins.expiry_date
            allEvents.push({
              id: ins.id,
              date: d,
              type: 'insurance',
              title: `${ins.type} Renewal`,
              subtitle: ins.provider || 'No provider',
              status: ins.status,
            })
          }
        })
      }

      // 4. Fetch Invoices with due dates
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, due_date, title, invoice_number, total, status, clients(name)')
        .eq('user_id', user.id)
        .gte('due_date', rangeStart)
        .lte('due_date', rangeEnd)
        .not('status', 'in', '("paid","cancelled")')
        .order('due_date')

      if (invoices) {
        ;(invoices as unknown as InvoiceRow[]).forEach((inv) => {
          if (inv.due_date) {
            const d = inv.due_date.split('T')[0] || inv.due_date
            allEvents.push({
              id: inv.id,
              date: d,
              type: 'invoice',
              title: `${inv.title || 'Invoice'} — ${inv.invoice_number || ''}`,
              subtitle: inv.clients?.name || 'No client',
              status: inv.status,
            })
          }
        })
      }

      setEvents(allEvents)
    } catch (err) {
      console.error('Error fetching calendar events:', err)
      toast.error('Failed to load calendar events')
    }

    setLoading(false)
  }, [supabase, year, month])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleDayClick = (date: string, dayEvents: CalendarEvent[]) => {
    if (dayEvents.length === 0) return
    setSelectedDay({ date, events: dayEvents })
    setShowDayModal(true)
  }

  // Summary counts for current month
  const monthEvents = events.filter((e) => {
    const [y, m] = e.date.split('-').map(Number)
    return y === year && m === month + 1
  })

  const visitCount = monthEvents.filter((e) => e.type === 'visit').length
  const followUpCount = monthEvents.filter((e) => e.type === 'follow_up').length
  const insuranceCount = monthEvents.filter((e) => e.type === 'insurance').length
  const invoiceCount = monthEvents.filter((e) => e.type === 'invoice').length
  const totalCount = monthEvents.length

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="mt-1 text-sm text-muted">Visits, follow-ups, renewals & invoice due dates</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Calendar */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-md card-glow lg:col-span-3">
          {/* Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={goToPrevMonth}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
              <Button variant="secondary" size="sm" onClick={goToNextMonth}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {MONTH_NAMES[month]} {year}
            </h2>
            <div className="w-24" /> {/* spacer */}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted">Loading calendar...</p>
            </div>
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              events={events}
              onDayClick={handleDayClick}
            />
          )}

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-card-border pt-4">
            <span className="text-xs font-medium text-muted">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-muted">Visits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-xs text-muted">Follow-ups</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-3 w-3 rounded-full bg-red-500" />
              <span className="text-xs text-muted">Overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-purple-400" />
              <span className="text-xs text-muted">Insurance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-amber-400" />
              <span className="text-xs text-muted">Invoice Due</span>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Month Summary</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>Visits</span>
                </div>
                <span className="text-sm font-bold text-foreground">{visitCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Bell className="h-4 w-4 text-amber-400" />
                  <span>Follow-ups</span>
                </div>
                <span className="text-sm font-bold text-foreground">{followUpCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span>Renewals</span>
                </div>
                <span className="text-sm font-bold text-foreground">{insuranceCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span>Invoices Due</span>
                </div>
                <span className="text-sm font-bold text-foreground">{invoiceCount}</span>
              </div>

              <div className="border-t border-card-border pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{totalCount}</span>
              </div>
            </div>
          </Card>

          {/* Quick info */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {MONTH_NAMES[month]} Highlights
            </h3>
            {totalCount === 0 ? (
              <p className="text-xs text-muted">No events this month</p>
            ) : (
              <div className="space-y-2 text-xs text-muted">
                {visitCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    {visitCount} visit{visitCount !== 1 ? 's' : ''} scheduled
                  </p>
                )}
                {followUpCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-amber-400" />
                    {followUpCount} follow-up{followUpCount !== 1 ? 's' : ''} due
                  </p>
                )}
                {insuranceCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-400" />
                    {insuranceCount} insurance renewal{insuranceCount !== 1 ? 's' : ''}
                  </p>
                )}
                {invoiceCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''} due
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={goToPrevMonth} className="flex-1">
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={goToNextMonth} className="flex-1">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Day Events Modal */}
      {selectedDay && (
        <DayEventsModal
          open={showDayModal}
          onClose={() => setShowDayModal(false)}
          date={selectedDay.date}
          events={selectedDay.events}
        />
      )}
    </div>
  )
}

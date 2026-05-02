import { cn } from '@/lib/utils'

const colorVariants = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

interface BadgeProps {
  variant?: keyof typeof colorVariants
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colorVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): keyof typeof colorVariants {
  const map: Record<string, keyof typeof colorVariants> = {
    active: 'green',
    inactive: 'red',
    lead: 'amber',
    draft: 'gray',
    sent: 'blue',
    accepted: 'green',
    declined: 'red',
    invoiced: 'green',
    scheduled: 'blue',
    completed: 'green',
    cancelled: 'red',
    rescheduled: 'amber',
  }
  return map[status.toLowerCase()] || 'gray'
}

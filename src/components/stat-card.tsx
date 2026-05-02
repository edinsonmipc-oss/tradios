import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: {
    value: string
    direction: 'up' | 'down'
  }
  className?: string
}

export function StatCard({ icon, label, value, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-card-border bg-card p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:border-primary/30 card-glow',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="text-primary">{icon}</div>
        </div>
        {trend && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

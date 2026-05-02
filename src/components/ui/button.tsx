'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  default: 'bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md',
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md',
  secondary: 'bg-card border border-card-border text-foreground hover:bg-card-hover hover:border-primary/30',
  ghost: 'text-muted hover:text-foreground hover:bg-card-hover',
  danger: 'bg-danger text-white hover:bg-red-700 shadow-sm',
  success: 'bg-success text-white hover:bg-emerald-600 shadow-sm',
  gold: 'bg-secondary text-white hover:bg-secondary-dark shadow-sm hover:shadow-md',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

type ButtonVariant = keyof typeof variants
type ButtonSize = keyof typeof sizes

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonVariant, ButtonSize }

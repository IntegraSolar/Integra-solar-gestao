import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, children, disabled, style, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, rgba(255,180,50,0.25), rgba(255,220,100,0.15))',
        border: '1px solid rgba(255,180,50,0.3)',
        color: 'var(--theme-accent)',
      },
      secondary: {
        background: 'var(--theme-input-bg)',
        border: '1px solid var(--theme-input-border)',
        color: 'var(--theme-text-muted)',
      },
      ghost: {
        background: 'transparent',
        color: 'var(--theme-text-muted)',
      },
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:brightness-125',
          className
        )}
        style={{ ...variantStyles[variant ?? 'primary'], ...style }}
        {...props}
      >
        {loading ? (
          <span
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'rgba(255,200,100,0.6)', borderTopColor: 'transparent' }}
          />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={id}
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all',
            className
          )}
          style={{
            background: 'var(--theme-input-bg)',
            border: error
              ? '1px solid rgba(255,100,100,0.5)'
              : '1px solid var(--theme-input-border)',
            color: 'var(--theme-input-text)',
            ...(style ?? {}),
          }}
          {...props}
        />
        {error ? (
          <p className="text-xs" style={{ color: '#FF9090' }}>
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

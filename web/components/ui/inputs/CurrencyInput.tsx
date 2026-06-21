'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  label?: string
  name?: string
  value?: number | null
  onChange?: (value: number) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

function centsToDisplay(cents: number): string {
  const reais = cents / 100
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function valueToCents(value: number | null | undefined): number {
  if (!value) return 0
  return Math.round(value * 100)
}

const inputStyle = {
  background: 'var(--theme-input-bg)',
  border: '1px solid var(--theme-input-border)',
  color: 'var(--theme-input-text)',
}

export function CurrencyInput({
  label,
  name,
  value,
  onChange,
  error,
  required,
  placeholder = 'R$ 0,00',
  disabled,
}: CurrencyInputProps) {
  const [cents, setCents] = useState<number>(valueToCents(value))

  useEffect(() => {
    setCents(valueToCents(value))
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = Math.floor(cents / 10)
      setCents(next)
      onChange?.(next / 100)
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault()
      const next = cents * 10 + parseInt(e.key)
      setCents(next)
      onChange?.(next / 100)
    }
  }

  const displayValue = cents === 0 ? '' : centsToDisplay(cents)
  const rawValue = (cents / 100).toFixed(2)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        disabled={disabled}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{
          ...inputStyle,
          border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {name && <input type="hidden" name={name} value={rawValue} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}

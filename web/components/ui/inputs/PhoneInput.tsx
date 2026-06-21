'use client'

import { useState, useEffect } from 'react'
import { cleanDigits } from '@/lib/format'

interface PhoneInputProps {
  label?: string
  name?: string
  value?: string | null
  onChange?: (raw: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

function applyPhoneMask(digits: string): string {
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

const inputStyle = {
  background: 'var(--theme-input-bg)',
  border: '1px solid var(--theme-input-border)',
  color: 'var(--theme-input-text)',
}

export function PhoneInput({
  label, name, value, onChange, error, required, placeholder = '(00) 00000-0000', disabled,
}: PhoneInputProps) {
  const [digits, setDigits] = useState<string>(cleanDigits(value ?? ''))

  useEffect(() => {
    setDigits(cleanDigits(value ?? ''))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = cleanDigits(e.target.value).slice(0, 11)
    setDigits(d)
    onChange?.(d)
  }

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
        value={applyPhoneMask(digits)}
        placeholder={placeholder}
        onChange={handleChange}
        disabled={disabled}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{
          ...inputStyle,
          border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {name && <input type="hidden" name={name} value={digits} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { cleanDigits } from '@/lib/format'

interface CpfCnpjInputProps {
  label?: string
  name?: string
  value?: string | null
  onChange?: (raw: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

function applyMask(digits: string): string {
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }
  // CNPJ: 00.000.000/0000-00
  const d = digits.slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const inputStyle = {
  background: 'var(--theme-input-bg)',
  border: '1px solid var(--theme-input-border)',
  color: 'var(--theme-input-text)',
}

export function CpfCnpjInput({
  label, name, value, onChange, error, required, placeholder = 'CPF ou CNPJ', disabled,
}: CpfCnpjInputProps) {
  const [digits, setDigits] = useState<string>(cleanDigits(value ?? ''))

  useEffect(() => {
    setDigits(cleanDigits(value ?? ''))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = cleanDigits(e.target.value).slice(0, 14)
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
        value={applyMask(digits)}
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

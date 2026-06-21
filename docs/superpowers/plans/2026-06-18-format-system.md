# Sistema Global de Formatação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar FormatService centralizado, componentes de input mascarados e DatePicker visual. Migrar todos os formulários e exibições existentes para o novo sistema.

**Architecture:** `lib/format/index.ts` (funções puras) → `components/ui/inputs/` (componentes React) → migração de 30+ arquivos.

**Tech Stack:** Next.js 14 App Router, TypeScript, react-day-picker v9, date-fns, glassmorphism theme.

---

### Task 1: Instalar dependências

**Files:** package.json

- [ ] **Step 1: Instalar react-day-picker e date-fns**

```bash
cd web && npm install react-day-picker date-fns
```

Expected: pacotes instalados sem erros.

- [ ] **Step 2: Verificar instalação**

```bash
cd web && node -e "require('react-day-picker'); require('date-fns'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd web && git add package.json package-lock.json
git commit -m "chore: install react-day-picker and date-fns"
```

---

### Task 2: FormatService — lib/format/index.ts

**Files:**
- Create: `web/lib/format/index.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// web/lib/format/index.ts

// ── Formatação para exibição ──────────────────────────────────────────────

export function formatCurrency(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatPhone(v: string | null | undefined): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return v
}

export function formatCPF(v: string | null | undefined): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length !== 11) return v
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatCNPJ(v: string | null | undefined): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length !== 14) return v
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatCpfCnpj(v: string | null | undefined): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length <= 11) return formatCPF(d)
  return formatCNPJ(d)
}

export function formatCEP(v: string | null | undefined): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length !== 8) return v
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function formatDate(v: string | null | undefined): string {
  if (!v) return '—'
  // Accepts ISO "2026-06-18" or "2026-06-18T..."
  const iso = v.split('T')[0]
  const parts = iso.split('-')
  if (parts.length !== 3) return v
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function formatPercent(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

export function formatKwp(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kWp'
}

export function formatKwh(v: number | string | null | undefined, period: 'mes' | 'ano' | '' = 'mes'): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  const formatted = n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  if (period === 'mes') return `${formatted} kWh/mês`
  if (period === 'ano') return `${formatted} kWh/ano`
  return `${formatted} kWh`
}

export function formatArea(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
}

export function formatWeight(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg'
}

export function formatNumber(v: number | string | null | undefined, decimals = 2): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ── Limpeza (remove formatação) ───────────────────────────────────────────

export function cleanDigits(v: string): string {
  return v.replace(/\D/g, '')
}

export function cleanCurrency(v: string): number {
  // "R$ 12.500,50" → 12500.50
  const cleaned = v
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function toISODate(v: string): string {
  // "18/06/2026" → "2026-06-18"
  const parts = v.split('/')
  if (parts.length !== 3) return v
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

// ── Validação ─────────────────────────────────────────────────────────────

export function validateCPF(v: string): boolean {
  return cleanDigits(v).length === 11
}

export function validateCNPJ(v: string): boolean {
  return cleanDigits(v).length === 14
}

export function validatePhone(v: string): boolean {
  const d = cleanDigits(v)
  return d.length === 10 || d.length === 11
}

export function validateCEP(v: string): boolean {
  return cleanDigits(v).length === 8
}

// ── Objeto unificado (atalho) ─────────────────────────────────────────────

export const fmt = {
  currency: formatCurrency,
  phone: formatPhone,
  cpf: formatCPF,
  cnpj: formatCNPJ,
  cpfCnpj: formatCpfCnpj,
  cep: formatCEP,
  date: formatDate,
  percent: formatPercent,
  kwp: formatKwp,
  kwh: formatKwh,
  area: formatArea,
  weight: formatWeight,
  number: formatNumber,
  clean: cleanDigits,
  cleanCurrency,
  toISODate,
  validateCPF,
  validateCNPJ,
  validatePhone,
  validateCEP,
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "format"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add lib/format/index.ts
git commit -m "feat: add centralized FormatService"
```

---

### Task 3: Componentes de input mascarados

**Files:**
- Create: `web/components/ui/inputs/CurrencyInput.tsx`
- Create: `web/components/ui/inputs/PhoneInput.tsx`
- Create: `web/components/ui/inputs/CpfCnpjInput.tsx`
- Create: `web/components/ui/inputs/CepInput.tsx`
- Create: `web/components/ui/inputs/PercentInput.tsx`
- Create: `web/components/ui/inputs/index.ts`

- [ ] **Step 1: Criar CurrencyInput.tsx**

```tsx
// web/components/ui/inputs/CurrencyInput.tsx
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
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
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
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        onChange={() => {}} // controlled via onKeyDown
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
```

- [ ] **Step 2: Criar PhoneInput.tsx**

```tsx
// web/components/ui/inputs/PhoneInput.tsx
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
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
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
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="tel"
        value={applyPhoneMask(digits)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{ ...inputStyle, border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border }}
      />
      {name && <input type="hidden" name={name} value={digits} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Criar CpfCnpjInput.tsx**

```tsx
// web/components/ui/inputs/CpfCnpjInput.tsx
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

function applyCpfCnpjMask(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  if (digits.length <= 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  // CNPJ
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  if (digits.length <= 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  return digits
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
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
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={applyCpfCnpjMask(digits)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{ ...inputStyle, border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border }}
      />
      {name && <input type="hidden" name={name} value={digits} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Criar CepInput.tsx**

```tsx
// web/components/ui/inputs/CepInput.tsx
'use client'

import { useState, useEffect } from 'react'
import { cleanDigits } from '@/lib/format'

interface CepInputProps {
  label?: string
  name?: string
  value?: string | null
  onChange?: (raw: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
}

function applyCepMask(digits: string): string {
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
}

export function CepInput({
  label, name, value, onChange, error, required, disabled,
}: CepInputProps) {
  const [digits, setDigits] = useState<string>(cleanDigits(value ?? ''))

  useEffect(() => {
    setDigits(cleanDigits(value ?? ''))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = cleanDigits(e.target.value).slice(0, 8)
    setDigits(d)
    onChange?.(d)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={applyCepMask(digits)}
        onChange={handleChange}
        placeholder="00000-000"
        disabled={disabled}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{ ...inputStyle, border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border }}
      />
      {name && <input type="hidden" name={name} value={digits} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Criar PercentInput.tsx**

```tsx
// web/components/ui/inputs/PercentInput.tsx
'use client'

import { useState, useEffect } from 'react'

interface PercentInputProps {
  label?: string
  name?: string
  value?: number | string | null
  onChange?: (value: number) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
}

function toFloat(v: number | string | null | undefined): string {
  if (v == null || v === '') return ''
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
  if (isNaN(n)) return ''
  return String(n).replace('.', ',')
}

export function PercentInput({
  label, name, value, onChange, error, required, placeholder = '0,00', disabled,
}: PercentInputProps) {
  const [display, setDisplay] = useState<string>(toFloat(value))

  useEffect(() => {
    setDisplay(toFloat(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // allow digits, comma, dot
    const raw = e.target.value.replace(/[^0-9,\.]/g, '')
    setDisplay(raw)
    const n = parseFloat(raw.replace(',', '.'))
    if (!isNaN(n)) onChange?.(n)
  }

  const rawValue = display.replace(',', '.')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl px-3.5 py-2.5 pr-8 text-sm outline-none transition-all"
          style={{ ...inputStyle, border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>%</span>
      </div>
      {name && <input type="hidden" name={name} value={rawValue} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Criar index.ts**

```typescript
// web/components/ui/inputs/index.ts
export { CurrencyInput } from './CurrencyInput'
export { PhoneInput } from './PhoneInput'
export { CpfCnpjInput } from './CpfCnpjInput'
export { CepInput } from './CepInput'
export { PercentInput } from './PercentInput'
export { DatePicker } from './DatePicker'
```

(DatePicker será criado na Task 4)

- [ ] **Step 7: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "inputs\|currency\|phone\|cpf\|cep\|percent"
```

Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
cd web && git add components/ui/inputs/
git commit -m "feat: add masked input components (currency, phone, cpfcnpj, cep, percent)"
```

---

### Task 4: DatePicker component

**Files:**
- Create: `web/components/ui/inputs/DatePicker.tsx`
- Create: `web/app/globals-datepicker.css` (estilos do react-day-picker)
- Modify: `web/app/globals.css` (import do datepicker css)

- [ ] **Step 1: Criar DatePicker.tsx**

```tsx
// web/components/ui/inputs/DatePicker.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, parse, isValid } from 'date-fns'
import { CalendarDays } from 'lucide-react'

interface DatePickerProps {
  label?: string
  name?: string
  value?: string | null  // ISO: "2026-06-18" or ""
  onChange?: (iso: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
}

function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  if (!isValid(d)) return ''
  return format(d, 'dd/MM/yyyy')
}

function displayToISO(display: string): string {
  if (display.length !== 10) return ''
  try {
    const d = parse(display, 'dd/MM/yyyy', new Date())
    if (!isValid(d)) return ''
    return format(d, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export function DatePicker({
  label, name, value, onChange, error, required, placeholder = 'dd/mm/aaaa', disabled,
}: DatePickerProps) {
  const [display, setDisplay] = useState<string>(isoToDisplay(value))
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplay(isoToDisplay(value))
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/[^0-9/]/g, '')
    // auto-insert slashes
    if (v.length === 2 && display.length === 1) v = v + '/'
    if (v.length === 5 && display.length === 4) v = v + '/'
    v = v.slice(0, 10)
    setDisplay(v)
    if (v.length === 10) {
      const iso = displayToISO(v)
      if (iso) onChange?.(iso)
    }
  }

  function handleDaySelect(day: Date | undefined) {
    if (!day) return
    const iso = format(day, 'yyyy-MM-dd')
    const disp = format(day, 'dd/MM/yyyy')
    setDisplay(disp)
    onChange?.(iso)
    setOpen(false)
  }

  const selectedDay = value ? (() => {
    const d = new Date(value + 'T12:00:00')
    return isValid(d) ? d : undefined
  })() : undefined

  const isoValue = value ?? ''

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={display}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none transition-all"
          style={{ ...inputStyle, border: error ? '1px solid rgba(255,100,100,0.5)' : inputStyle.border }}
        />
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          tabIndex={-1}
        >
          <CalendarDays size={15} style={{ color: 'rgba(255,255,255,0.35)' }} />
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 rounded-2xl border border-white/10 shadow-2xl"
          style={{ background: '#0f1424', minWidth: 280 }}
        >
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={handleDaySelect}
            locale={ptBR}
            classNames={{
              root: 'p-3',
              month_caption: 'flex justify-center items-center mb-2',
              caption_label: 'text-sm font-semibold text-white capitalize',
              nav: 'flex items-center justify-between absolute w-full top-3 px-3',
              button_previous: 'text-white/50 hover:text-white p-1 rounded-lg',
              button_next: 'text-white/50 hover:text-white p-1 rounded-lg',
              weekdays: 'flex mb-1',
              weekday: 'flex-1 text-center text-xs text-white/30 font-medium',
              weeks: 'space-y-1',
              week: 'flex',
              day: 'flex-1 text-center',
              day_button: 'w-8 h-8 mx-auto rounded-lg text-sm text-white/70 hover:bg-white/10 transition-colors',
              selected: '[&>button]:bg-yellow-400/90 [&>button]:text-black [&>button]:font-semibold',
              today: '[&>button]:border [&>button]:border-white/30',
              outside: '[&>button]:opacity-20',
              disabled: '[&>button]:opacity-20 [&>button]:cursor-not-allowed',
            }}
          />
        </div>
      )}

      {name && <input type="hidden" name={name} value={isoValue} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "datepicker\|daypicker"
```

Expected: sem erros (ou erros de tipos do react-day-picker que podem ser ignorados se não afetarem o build).

- [ ] **Step 3: Commit**

```bash
cd web && git add components/ui/inputs/DatePicker.tsx
git commit -m "feat: add DatePicker component with react-day-picker"
```

---

### Task 5: FormatDisplay component

**Files:**
- Create: `web/components/ui/FormatDisplay.tsx`

- [ ] **Step 1: Criar FormatDisplay.tsx**

```tsx
// web/components/ui/FormatDisplay.tsx
import { fmt } from '@/lib/format'

type DisplayType =
  | 'currency' | 'phone' | 'cpf' | 'cnpj' | 'cpfCnpj'
  | 'cep' | 'date' | 'percent' | 'kwp' | 'kwh' | 'kwhAno'
  | 'area' | 'weight' | 'number'

interface FormatDisplayProps {
  type: DisplayType
  value: number | string | null | undefined
  className?: string
  fallback?: string
}

export function FormatDisplay({ type, value, className, fallback = '—' }: FormatDisplayProps) {
  if (value == null || value === '') return <span className={className}>{fallback}</span>

  let result: string

  switch (type) {
    case 'currency':   result = fmt.currency(value); break
    case 'phone':      result = fmt.phone(String(value)); break
    case 'cpf':        result = fmt.cpf(String(value)); break
    case 'cnpj':       result = fmt.cnpj(String(value)); break
    case 'cpfCnpj':    result = fmt.cpfCnpj(String(value)); break
    case 'cep':        result = fmt.cep(String(value)); break
    case 'date':       result = fmt.date(String(value)); break
    case 'percent':    result = fmt.percent(value); break
    case 'kwp':        result = fmt.kwp(value); break
    case 'kwh':        result = fmt.kwh(value, 'mes'); break
    case 'kwhAno':     result = fmt.kwh(value, 'ano'); break
    case 'area':       result = fmt.area(value); break
    case 'weight':     result = fmt.weight(value); break
    case 'number':     result = fmt.number(value); break
    default:           result = String(value)
  }

  return <span className={className}>{result}</span>
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "formatdisplay"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add components/ui/FormatDisplay.tsx
git commit -m "feat: add FormatDisplay component"
```

---

### Task 6: Migrar Tab1DadosPessoais

**Files:**
- Modify: `web/app/(dashboard)/clientes/[id]/tabs/Tab1DadosPessoais.tsx`

Tab1 usa `useFormState` + FormData. Os campos `cpf_cnpj`, `phone` e `zip` precisam de máscara.
O servidor recebe os valores raw via hidden inputs.

- [ ] **Step 1: Atualizar Tab1DadosPessoais.tsx**

Substituir o arquivo completo:

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab1DadosPessoais.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { CpfCnpjInput, PhoneInput, CepInput } from '@/components/ui/inputs'
import { updateTab1 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 6,
  display: 'block',
}

export function Tab1DadosPessoais({ client }: { client: Client }) {
  const action = updateTab1.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Tipo de pessoa</label>
        <select name="type" defaultValue={client.type ?? 'pf'} style={selectStyle}>
          <option value="pf">Pessoa Física</option>
          <option value="pj">Pessoa Jurídica</option>
        </select>
      </div>

      <Input name="name" label="Nome *" defaultValue={client.name} required />
      <CpfCnpjInput name="cpf_cnpj" label="CPF / CNPJ" value={client.cpf_cnpj ?? ''} />
      <Input name="email" label="Email" type="email" defaultValue={client.email ?? ''} />
      <PhoneInput name="phone" label="Telefone" value={client.phone ?? ''} />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input name="street" label="Rua" defaultValue={client.street ?? ''} />
        </div>
        <Input name="number" label="Número" defaultValue={client.number ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="neighborhood" label="Bairro" defaultValue={client.neighborhood ?? ''} />
        <CepInput name="zip" label="CEP" value={client.zip ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="city" label="Cidade" defaultValue={client.city ?? ''} />
        <Input name="state" label="Estado" defaultValue={client.state ?? ''} placeholder="SP" />
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Dados Pessoais</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "tab1"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add "app/(dashboard)/clientes/[id]/tabs/Tab1DadosPessoais.tsx"
git commit -m "feat: apply masked inputs to Tab1DadosPessoais"
```

---

### Task 7: Migrar Tab3VendaFat

**Files:**
- Modify: `web/app/(dashboard)/clientes/[id]/tabs/Tab3VendaFat.tsx`

Tab3 usa `useFormState`. `sale_value` vai via FormData (CurrencyInput com `name`). As parcelas usam estado controlado, então `amount` e `due_date` recebem callbacks `onChange`.

- [ ] **Step 1: Atualizar Tab3VendaFat.tsx**

Substituir o arquivo completo:

```tsx
// web/app/(dashboard)/clientes/[id]/tabs/Tab3VendaFat.tsx
'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { CurrencyInput, DatePicker } from '@/components/ui/inputs'
import { updateTab3 } from '@/lib/clients/actions'
import { fmt } from '@/lib/format'
import type { Client, ActionResult } from '@/lib/clients/types'

interface Installment {
  position: number
  due_date: string
  amount: number
  notes: string
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#E0E8F0',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.40)',
  marginBottom: 6,
  display: 'block',
}

export function Tab3VendaFat({ client }: { client: Client }) {
  const action = updateTab3.bind(null, client.id)

  const initialInstallments: Installment[] = client.installments.map((inst) => ({
    position: inst.position,
    due_date: inst.due_date,
    amount: inst.amount,
    notes: inst.notes ?? '',
  }))

  const [installments, setInstallments] = useState<Installment[]>(
    initialInstallments.length > 0
      ? initialInstallments
      : [{ position: 1, due_date: '', amount: 0, notes: '' }]
  )

  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('installments_json', JSON.stringify(installments))
      return action(prev, formData)
    },
    {} as ActionResult
  )

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { position: prev.length + 1, due_date: '', amount: 0, notes: '' },
    ])
  }

  function removeInstallment(idx: number) {
    setInstallments((prev) =>
      prev.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, position: i + 1 }))
    )
  }

  const totalInstallments = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {/* Dados da venda */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
          Dados da Venda
        </p>
        <CurrencyInput
          name="sale_value"
          label="Valor total da venda *"
          value={client.sale?.sale_value ?? 0}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Forma de pagamento</label>
          <select name="payment_method" defaultValue={client.sale?.payment_method ?? ''} style={selectStyle}>
            <option value="">— Selecione —</option>
            <option value="financiamento">Financiamento</option>
            <option value="a_vista">À Vista</option>
            <option value="parcelado_cartao">Parcelado no Cartão</option>
            <option value="consorcio">Consórcio</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Comissão (%)</label>
            <input
              name="commission_pct"
              type="number"
              step="0.1"
              min="0"
              max="100"
              defaultValue={client.sale?.commission_pct.toString() ?? '0'}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#E0E8F0' }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Observações NF</label>
          <textarea
            name="nf_notes"
            defaultValue={client.sale?.nf_notes ?? ''}
            placeholder="Observações para nota fiscal..."
            rows={2}
            style={{ ...selectStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Parcelas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Parcelas
          </p>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Total: {fmt.currency(totalInstallments)}
          </span>
        </div>

        {installments.map((inst, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: idx === 0 ? '#FFD080' : 'rgba(255,255,255,0.50)' }}>
                {idx === 0 ? 'Parcela 1 (Entrada)' : `Parcela ${idx + 1}`}
              </span>
              {installments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInstallment(idx)}
                  className="text-xs"
                  style={{ color: 'rgba(255,80,80,0.50)' }}
                >
                  remover
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                label="Vencimento"
                value={inst.due_date || null}
                onChange={(iso) =>
                  setInstallments((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, due_date: iso } : p))
                  )
                }
                required
              />
              <CurrencyInput
                label="Valor"
                value={inst.amount}
                onChange={(v) =>
                  setInstallments((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, amount: v } : p))
                  )
                }
                required
              />
            </div>
            <input
              type="text"
              value={inst.notes}
              onChange={(e) =>
                setInstallments((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, notes: e.target.value } : p))
                )
              }
              placeholder="Observação (opcional)"
              style={{ ...selectStyle, padding: '7px 12px', fontSize: 13 }}
            />
          </div>
        ))}

        <Button type="button" variant="secondary" className="self-start text-xs py-1.5" onClick={addInstallment}>
          + Adicionar parcela
        </Button>
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Venda e Faturamento</SubmitButton>
    </form>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "tab3"
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add "app/(dashboard)/clientes/[id]/tabs/Tab3VendaFat.tsx"
git commit -m "feat: apply CurrencyInput and DatePicker to Tab3VendaFat"
```

---

### Task 8: Migrar EmpresaTab (Configurações)

**Files:**
- Modify: `web/app/(dashboard)/configuracoes/EmpresaTab.tsx`

Campos a migrar:
- `empresa.cnpj` → `CpfCnpjInput` (onChange atualiza estado)
- `empresa.telefone` → `PhoneInput`
- `empresa.cep` → `CepInput`
- `meta` (meta_anual) → `CurrencyInput`
- Campos de cálculo com `pct_*` → `PercentInput`
- Campos de cálculo com `valor_*` → `CurrencyInput`

- [ ] **Step 1: Ler o arquivo atual**

```bash
# Já lido durante planejamento — ver EmpresaTab.tsx acima
```

- [ ] **Step 2: Substituir o arquivo**

Substituir o arquivo completo `web/app/(dashboard)/configuracoes/EmpresaTab.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import type { OrgConfig, LeadOrigin } from '@/lib/configuracoes/queries'
import { saveOrgConfig, addLeadOrigin, removeLeadOrigin } from '@/lib/configuracoes/actions'
import { CpfCnpjInput, PhoneInput, CepInput, CurrencyInput, PercentInput } from '@/components/ui/inputs'
import { fmt } from '@/lib/format'

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
const labelCls = 'block text-xs text-white/50 mb-1'
const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
const cardStyle = { background: 'rgba(255,255,255,0.04)' }
const saveBtnCls = 'px-5 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50'
const saveBtnStyle = { background: '#FFD080', color: '#0a0e1a' }

function SectionFeedback({ result }: { result: { error?: string; success?: string } | null }) {
  if (!result) return null
  if (result.error) return <p className="text-red-400 text-xs mt-1">{result.error}</p>
  if (result.success) return <p className="text-green-400 text-xs mt-1">{result.success}</p>
  return null
}

export default function EmpresaTab({
  config,
  origins: initialOrigins,
}: {
  config: OrgConfig
  origins: LeadOrigin[]
}) {
  // ── Section 1: Dados da Empresa ──────────────────────────────────────────
  const [empresa, setEmpresa] = useState({
    razao_social: config.razao_social ?? '',
    nome_fantasia: config.nome_fantasia ?? '',
    cnpj: config.cnpj ?? '',
    email: config.email ?? '',
    telefone: config.telefone ?? '',
    cep: config.cep ?? '',
    endereco: config.endereco ?? '',
    bairro: config.bairro ?? '',
    numero: config.numero ?? '',
    cidade: config.cidade ?? '',
    estado: config.estado ?? '',
    concessionaria: config.concessionaria ?? '',
  })
  const [empresaPending, startEmpresa] = useTransition()
  const [empresaResult, setEmpresaResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 2: Dados para Cálculo ────────────────────────────────────────
  const [calculo, setCalculo] = useState({
    kwh_por_kwp: config.kwh_por_kwp ?? 0,
    valor_projeto_por_kwp: config.valor_projeto_por_kwp ?? 0,
    valor_instalacao_por_placa: config.valor_instalacao_por_placa ?? 0,
    pct_material_ca: config.pct_material_ca ?? 0,
    quilometragem: config.quilometragem ?? 0,
    pct_comissao: config.pct_comissao ?? 0,
    pct_imposto: config.pct_imposto ?? 0,
    pct_margem: config.pct_margem ?? 0,
  })
  const [calculoPending, startCalculo] = useTransition()
  const [calculoResult, setCalculoResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 3: Dados Bancários ────────────────────────────────────────────
  const [banco, setBanco] = useState({
    banco: config.banco ?? '',
    agencia: config.agencia ?? '',
    conta: config.conta ?? '',
    tipo_chave_pix: config.tipo_chave_pix ?? 'CPF',
    pix: config.pix ?? '',
  })
  const [bancoPending, startBanco] = useTransition()
  const [bancoResult, setBancoResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 4: Meta Anual ─────────────────────────────────────────────────
  const [meta, setMeta] = useState<number>(config.meta_anual ?? 0)
  const [metaPending, startMeta] = useTransition()
  const [metaResult, setMetaResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 5: Origens de Lead ────────────────────────────────────────────
  const [origins, setOrigins] = useState<LeadOrigin[]>(initialOrigins)
  const [newOrigin, setNewOrigin] = useState('')
  const [originsPending, startOrigins] = useTransition()

  function handleSaveEmpresa() {
    setEmpresaResult(null)
    startEmpresa(async () => {
      const res = await saveOrgConfig(empresa)
      setEmpresaResult(res)
    })
  }

  function handleSaveCalculo() {
    setCalculoResult(null)
    startCalculo(async () => {
      const res = await saveOrgConfig({
        kwh_por_kwp: calculo.kwh_por_kwp || null,
        valor_projeto_por_kwp: calculo.valor_projeto_por_kwp || null,
        valor_instalacao_por_placa: calculo.valor_instalacao_por_placa || null,
        pct_material_ca: calculo.pct_material_ca || null,
        quilometragem: calculo.quilometragem || null,
        pct_comissao: calculo.pct_comissao || null,
        pct_imposto: calculo.pct_imposto || null,
        pct_margem: calculo.pct_margem || null,
      })
      setCalculoResult(res)
    })
  }

  function handleSaveBanco() {
    setBancoResult(null)
    startBanco(async () => {
      const res = await saveOrgConfig(banco)
      setBancoResult(res)
    })
  }

  function handleSaveMeta() {
    setMetaResult(null)
    startMeta(async () => {
      const res = await saveOrgConfig({ meta_anual: meta || null })
      setMetaResult(res)
    })
  }

  function handleAddOrigin() {
    if (!newOrigin.trim()) return
    startOrigins(async () => {
      const res = await addLeadOrigin(newOrigin)
      if (res.success) {
        setOrigins((prev) => [...prev, { id: crypto.randomUUID(), name: newOrigin.trim() }])
        setNewOrigin('')
      }
    })
  }

  function handleRemoveOrigin(id: string) {
    startOrigins(async () => {
      const res = await removeLeadOrigin(id)
      if (res.success) setOrigins((prev) => prev.filter((o) => o.id !== id))
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Dados da Empresa ──────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Dados da Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Razão Social</label>
            <input className={inputCls} value={empresa.razao_social}
              onChange={(e) => setEmpresa((p) => ({ ...p, razao_social: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Nome Fantasia</label>
            <input className={inputCls} value={empresa.nome_fantasia}
              onChange={(e) => setEmpresa((p) => ({ ...p, nome_fantasia: e.target.value }))} />
          </div>
          <CpfCnpjInput label="CNPJ" value={empresa.cnpj}
            onChange={(v) => setEmpresa((p) => ({ ...p, cnpj: v }))} />
          <div>
            <label className={labelCls}>E-mail</label>
            <input className={inputCls} type="email" value={empresa.email}
              onChange={(e) => setEmpresa((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <PhoneInput label="Telefone" value={empresa.telefone}
            onChange={(v) => setEmpresa((p) => ({ ...p, telefone: v }))} />
          <CepInput label="CEP" value={empresa.cep}
            onChange={(v) => setEmpresa((p) => ({ ...p, cep: v }))} />
          <div>
            <label className={labelCls}>Endereço</label>
            <input className={inputCls} value={empresa.endereco}
              onChange={(e) => setEmpresa((p) => ({ ...p, endereco: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Bairro</label>
            <input className={inputCls} value={empresa.bairro}
              onChange={(e) => setEmpresa((p) => ({ ...p, bairro: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Número</label>
            <input className={inputCls} value={empresa.numero}
              onChange={(e) => setEmpresa((p) => ({ ...p, numero: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Cidade</label>
            <input className={inputCls} value={empresa.cidade}
              onChange={(e) => setEmpresa((p) => ({ ...p, cidade: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <input className={inputCls} value={empresa.estado}
              onChange={(e) => setEmpresa((p) => ({ ...p, estado: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Concessionária</label>
            <input className={inputCls} value={empresa.concessionaria}
              onChange={(e) => setEmpresa((p) => ({ ...p, concessionaria: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className={saveBtnCls} style={saveBtnStyle} disabled={empresaPending} onClick={handleSaveEmpresa}>
            {empresaPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={empresaResult} />
        </div>
      </div>

      {/* ── 2. Dados para Cálculo ────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Dados para Cálculo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Geração kWh/kWp</label>
            <input className={inputCls} type="number" step="0.01"
              value={calculo.kwh_por_kwp || ''}
              onChange={(e) => setCalculo((p) => ({ ...p, kwh_por_kwp: parseFloat(e.target.value) || 0 }))} />
          </div>
          <CurrencyInput label="Valor projeto/kWp (R$)" value={calculo.valor_projeto_por_kwp}
            onChange={(v) => setCalculo((p) => ({ ...p, valor_projeto_por_kwp: v }))} />
          <CurrencyInput label="Instalação/placa (R$)" value={calculo.valor_instalacao_por_placa}
            onChange={(v) => setCalculo((p) => ({ ...p, valor_instalacao_por_placa: v }))} />
          <PercentInput label="Material CA (%)" value={calculo.pct_material_ca}
            onChange={(v) => setCalculo((p) => ({ ...p, pct_material_ca: v }))} />
          <CurrencyInput label="Quilometragem (R$/km)" value={calculo.quilometragem}
            onChange={(v) => setCalculo((p) => ({ ...p, quilometragem: v }))} />
          <PercentInput label="Comissão (%)" value={calculo.pct_comissao}
            onChange={(v) => setCalculo((p) => ({ ...p, pct_comissao: v }))} />
          <PercentInput label="Imposto (%)" value={calculo.pct_imposto}
            onChange={(v) => setCalculo((p) => ({ ...p, pct_imposto: v }))} />
          <PercentInput label="Margem de lucro (%)" value={calculo.pct_margem}
            onChange={(v) => setCalculo((p) => ({ ...p, pct_margem: v }))} />
        </div>
        <div className="flex items-center gap-3">
          <button className={saveBtnCls} style={saveBtnStyle} disabled={calculoPending} onClick={handleSaveCalculo}>
            {calculoPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={calculoResult} />
        </div>
      </div>

      {/* ── 3. Dados Bancários ───────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Dados Bancários</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={labelCls}>Banco</label>
            <input className={inputCls} value={banco.banco}
              onChange={(e) => setBanco((p) => ({ ...p, banco: e.target.value }))} /></div>
          <div><label className={labelCls}>Agência</label>
            <input className={inputCls} value={banco.agencia}
              onChange={(e) => setBanco((p) => ({ ...p, agencia: e.target.value }))} /></div>
          <div><label className={labelCls}>Conta</label>
            <input className={inputCls} value={banco.conta}
              onChange={(e) => setBanco((p) => ({ ...p, conta: e.target.value }))} /></div>
          <div>
            <label className={labelCls}>Tipo de Chave PIX</label>
            <select className={inputCls} value={banco.tipo_chave_pix}
              onChange={(e) => setBanco((p) => ({ ...p, tipo_chave_pix: e.target.value }))}>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="E-mail">E-mail</option>
              <option value="Telefone">Telefone</option>
              <option value="Aleatória">Aleatória</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className={labelCls}>PIX</label>
            <input className={inputCls} value={banco.pix}
              onChange={(e) => setBanco((p) => ({ ...p, pix: e.target.value }))} /></div>
        </div>
        <div className="flex items-center gap-3">
          <button className={saveBtnCls} style={saveBtnStyle} disabled={bancoPending} onClick={handleSaveBanco}>
            {bancoPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={bancoResult} />
        </div>
      </div>

      {/* ── 4. Meta Anual ────────────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Meta Anual</h2>
        <div className="max-w-xs">
          <CurrencyInput label="Meta anual (R$)" value={meta} onChange={setMeta} />
        </div>
        {meta > 0 && (
          <p className="text-white/60 text-sm">
            Meta mensal: <span className="text-white font-medium">{fmt.currency(meta / 12)}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          <button className={saveBtnCls} style={saveBtnStyle} disabled={metaPending} onClick={handleSaveMeta}>
            {metaPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={metaResult} />
        </div>
      </div>

      {/* ── 5. Origens de Lead ───────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Origens de Lead</h2>
        {origins.length === 0 ? (
          <p className="text-white/40 text-sm">Nenhuma origem cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {origins.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <span className="text-white text-sm">{o.name}</span>
                <button className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  disabled={originsPending} onClick={() => handleRemoveOrigin(o.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Nova origem..."
            value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOrigin()} />
          <button className={`${saveBtnCls} whitespace-nowrap`} style={saveBtnStyle}
            disabled={originsPending || !newOrigin.trim()} onClick={handleAddOrigin}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -i "empresa"
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd web && git add "app/(dashboard)/configuracoes/EmpresaTab.tsx"
git commit -m "feat: apply masked inputs to EmpresaTab"
```

---

### Task 9: Migrar CompraDetail e módulos de pipeline com datas/valores

**Files:**
- Modify: `web/app/(dashboard)/compras/[id]/CompraDetail.tsx`
- Modify: `web/app/(dashboard)/obra/[id]/ObraDetail.tsx`
- Modify: `web/app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx`
- Modify: `web/app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx`
- Modify: `web/app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx`

Em todos esses arquivos, o padrão é `<input type="date">` em estado controlado. Substituir por `<DatePicker>`. O valor vai para server action diretamente via `form.data_xxx`.

- [ ] **Step 1: Migrar CompraDetail.tsx**

Ler o arquivo. Localizar:
```tsx
// Campo valor: <input type="number" ... value={form.valor} onChange={...} />
// Campo data: <input type="date" ... value={form.data_prevista} onChange={...} />
```

Substituir pelos imports e componentes:

No topo do arquivo, adicionar:
```tsx
import { CurrencyInput, DatePicker } from '@/components/ui/inputs'
```

Mudar o estado de `form.valor` para `number`:
```tsx
// De:
const [form, setForm] = useState({
  valor: compra.valor?.toString() ?? '',
  ...
})

// Para:
const [form, setForm] = useState({
  valor: compra.valor ?? 0,
  ...
})
```

Mudar o `handleSave` para usar `form.valor` diretamente (já é number):
```tsx
// De:
valor: form.valor ? parseFloat(form.valor) : null,
// Para:
valor: form.valor || null,
```

Substituir o input de valor:
```tsx
// De:
<div>
  <label className={labelCls}>Valor (R$)</label>
  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className={inputCls} placeholder="0,00" />
</div>

// Para:
<CurrencyInput label="Valor (R$)" value={form.valor} onChange={(v) => setForm((f) => ({ ...f, valor: v }))} />
```

Substituir o input de data:
```tsx
// De:
<div>
  <label className={labelCls}>Data prevista de entrega</label>
  <input type="date" value={form.data_prevista} onChange={(e) => setForm((f) => ({ ...f, data_prevista: e.target.value }))} className={inputCls} />
</div>

// Para:
<DatePicker label="Data prevista de entrega" value={form.data_prevista || null} onChange={(iso) => setForm((f) => ({ ...f, data_prevista: iso }))} />
```

- [ ] **Step 2: Migrar ObraDetail.tsx**

Ler o arquivo. Localizar todos os `<input type="date">` e substituir por `<DatePicker>`.
Adicionar import: `import { DatePicker } from '@/components/ui/inputs'`
Para cada campo de data no estado controlado:
```tsx
// De:
<input type="date" value={form.data_xxx} onChange={(e) => setForm((f) => ({ ...f, data_xxx: e.target.value }))} className={inputCls} />
// Para:
<DatePicker value={form.data_xxx || null} onChange={(iso) => setForm((f) => ({ ...f, data_xxx: iso }))} />
```
Remover o `<label>` separado quando usar DatePicker com prop `label`.

- [ ] **Step 3: Migrar EntregaMaterialDetail.tsx, EntregaObraDetail.tsx, PosObraDetail.tsx**

Para cada arquivo: ler, localizar `<input type="date">`, substituir por `<DatePicker>` com mesmo padrão do Step 2.
PosObraDetail pode ter campo `data_contato` — mesmo tratamento.

- [ ] **Step 4: Migrar ProjetoDetail.tsx**

Ler o arquivo. Tem 4 campos de data: `data_protocolo`, `prazo_protocolo`, `data_solicitacao_vistoria`, `prazo_vistoria`.
Adicionar import: `import { DatePicker } from '@/components/ui/inputs'`
Para cada um:
```tsx
// De:
<div>
  <label className={labelCls}>Data de protocolo</label>
  <input type="date" value={form.data_protocolo} onChange={(e) => setForm((f) => ({ ...f, data_protocolo: e.target.value }))} className={inputCls} />
</div>
// Para:
<DatePicker label="Data de protocolo" value={form.data_protocolo || null} onChange={(iso) => setForm((f) => ({ ...f, data_protocolo: iso }))} />
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1
```

Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
cd web && git add "app/(dashboard)/compras/[id]/CompraDetail.tsx" "app/(dashboard)/obra/[id]/ObraDetail.tsx" "app/(dashboard)/entrega-material/[id]/EntregaMaterialDetail.tsx" "app/(dashboard)/entrega-obra/[id]/EntregaObraDetail.tsx" "app/(dashboard)/pos-obra/[id]/PosObraDetail.tsx" "app/(dashboard)/projetos/[id]/ProjetoDetail.tsx"
git commit -m "feat: apply DatePicker and CurrencyInput to pipeline detail pages"
```

---

### Task 10: Migrar ComissaoDetail e EstoqueClient

**Files:**
- Modify: `web/app/(dashboard)/comissoes/[id]/ComissaoDetail.tsx`
- Modify: `web/app/(dashboard)/estoque/EstoqueClient.tsx`

- [ ] **Step 1: Migrar ComissaoDetail.tsx**

Ler o arquivo. Localizar campos de percentual e valor. Substituir:
- Campos `pct_*` → `<PercentInput>`
- Campos de valor monetário → `<CurrencyInput>`
- Campos de data → `<DatePicker>`

Adicionar import: `import { CurrencyInput, PercentInput, DatePicker } from '@/components/ui/inputs'`

- [ ] **Step 2: Migrar EstoqueClient.tsx**

O campo `unit_value` é monetário. Localizar no modal:
```tsx
// De:
<input type="number" min="0" step="0.01" ... value={form.unit_value} onChange={(e) => setForm({ ...form, unit_value: e.target.value })} ... />

// Para:
<CurrencyInput label="Valor Unitário (R$)" value={parseFloat(form.unit_value) || 0}
  onChange={(v) => setForm({ ...form, unit_value: String(v) })} />
```

Adicionar import: `import { CurrencyInput } from '@/components/ui/inputs'`

No `handleSave`, `unit_value` já é `parseFloat(form.unit_value)` — manter como está.

- [ ] **Step 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd web && git add "app/(dashboard)/comissoes/[id]/ComissaoDetail.tsx" "app/(dashboard)/estoque/EstoqueClient.tsx"
git commit -m "feat: apply masked inputs to ComissaoDetail and EstoqueClient"
```

---

### Task 11: Migrar exibições — substituir formatBRL/formatCurrency inline por fmt.*

**Files:**
- Modify: `web/app/(dashboard)/financeiro/[id]/ParcelasClient.tsx`
- Modify: `web/app/(dashboard)/financeiro/FinanceiroPainelClient.tsx`
- Modify: `web/app/(dashboard)/comissoes/ComissoesPainelClient.tsx`
- Modify: `web/app/(dashboard)/compras/page.tsx`
- Modify: `web/app/(dashboard)/contratos/page.tsx`
- Modify: `web/app/(dashboard)/clientes/page.tsx`
- Modify: `web/app/(dashboard)/dashboard/KpiCards.tsx`
- Modify: `web/app/(dashboard)/dashboard/MetaCard.tsx`
- Modify: `web/app/(dashboard)/dashboard/FaturamentoChart.tsx`
- Modify: `web/app/(dashboard)/relatorios/RelatoriosClient.tsx`

Para cada arquivo:

- [ ] **Step 1: Substituir funções inline**

Padrão a encontrar e substituir:
```tsx
// Remover definições locais de formatação:
function formatBRL(value: number) { ... }
function formatCurrency(val: number | null) { ... }
function fmt(v: number) { ... }

// Adicionar import no topo:
import { fmt } from '@/lib/format'

// Substituir chamadas:
formatBRL(value)      → fmt.currency(value)
formatCurrency(value) → fmt.currency(value)
toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) → (use fmt.currency instead)
new Date(x).toLocaleDateString('pt-BR') → fmt.date(x)
```

Para `ParcelasClient.tsx` especificamente:
```tsx
// De:
function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
// Remover essa função e adicionar import { fmt } from '@/lib/format'
// Substituir formatBRL(x) por fmt.currency(x)

// De:
Venc: {new Date(p.due_date).toLocaleDateString('pt-BR')}
// Para:
Venc: {fmt.date(p.due_date)}

// De:
` · Pago em: ${new Date(p.confirmed_at).toLocaleDateString('pt-BR')}`
// Para:
` · Pago em: ${fmt.date(p.confirmed_at)}`
```

Para `RelatoriosClient.tsx`:
```tsx
// De:
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtNum(v: number, decimals = 0) { return v.toLocaleString('pt-BR', ...) }
function fmtPct(v: number) { return v.toFixed(1) + '%' }
// Para:
import { fmt as format } from '@/lib/format'
// E substituir: fmt(x) → format.currency(x), fmtPct(x) → format.percent(x)
// Renomear variável local fmt para format para não conflitar
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd web && git add -A
git commit -m "feat: replace inline format functions with centralized fmt service"
```

---

### Task 12: Verificação final de TypeScript e testes manuais

**Files:** nenhum novo

- [ ] **Step 1: Rodar TypeScript completo**

```bash
cd web && npx tsc --noEmit 2>&1
```

Expected: zero erros.

- [ ] **Step 2: Corrigir erros encontrados**

Se houver erros, corrigi-los antes de continuar.

- [ ] **Step 3: Verificar que lib/format é importada corretamente**

```bash
cd web && grep -r "from '@/lib/format'" app/ components/ --include="*.tsx" --include="*.ts" | wc -l
```

Expected: número > 0 (confirma que o serviço está sendo usado).

- [ ] **Step 4: Commit final se necessário**

```bash
cd web && git add -A && git commit -m "fix: final typescript fixes for format system migration"
```

---

### Nota sobre `lib/format` — caminho de importação

O alias `@/lib/format` aponta para `web/lib/format/index.ts`. Verificar que `tsconfig.json` tem `@/*` apontando para `./` ou `./*`. Se o arquivo for em `lib/format/index.ts`, o import `from '@/lib/format'` resolve automaticamente via index.ts.

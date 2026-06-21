'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { format, parse, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  label?: string
  name?: string
  value?: string | null
  onChange?: (iso: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function CalendarGrid({
  month,
  selected,
  onSelect,
  onMonthChange,
}: {
  month: Date
  selected: Date | undefined
  onSelect: (day: Date) => void
  onMonthChange: (d: Date) => void
}) {
  const today = useMemo(() => new Date(), [])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { locale: ptBR })
    const end = endOfWeek(endOfMonth(month), { locale: ptBR })
    const result: Date[] = []
    let d = start
    while (d <= end) {
      result.push(d)
      d = addDays(d, 1)
    }
    return result
  }, [month])

  return (
    <div style={{ width: 280, padding: '16px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', textTransform: 'capitalize' }}>
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => onMonthChange(subMonths(month, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--theme-text-subtle)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--theme-text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--theme-text-subtle)')}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--theme-text-subtle)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--theme-text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--theme-text-subtle)')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 6 }}>
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            style={{ fontSize: 10, fontWeight: 500, color: 'var(--theme-text-subtle)', letterSpacing: '0.5px', padding: '4px 0' }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: 2 }}>
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, today)
          const isSelected = selected && isSameDay(day, selected)

          let bg = 'transparent'
          let color = isCurrentMonth ? 'var(--theme-text-muted)' : 'var(--theme-text-subtle)'
          let fontWeight: number = 400

          if (isSelected) {
            bg = 'var(--theme-accent)'
            color = 'var(--theme-accent-text)'
            fontWeight = 500
          } else if (isToday) {
            bg = 'var(--theme-text-subtle)'
            color = 'var(--theme-text)'
            fontWeight = 500
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(day)}
              style={{
                background: bg,
                color,
                fontWeight,
                fontSize: 13,
                padding: '7px 0',
                borderRadius: 6,
                border: 'none',
                cursor: isCurrentMonth ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected && isCurrentMonth) e.currentTarget.style.background = 'var(--theme-input-bg)'
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isToday) e.currentTarget.style.background = 'transparent'
                else if (isToday && !isSelected) e.currentTarget.style.background = 'var(--theme-text-subtle)'
              }}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DatePicker({
  label, name, value, onChange, error, required, placeholder = 'dd/mm/aaaa', disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [selected, setSelected] = useState<Date | undefined>(undefined)
  const [viewMonth, setViewMonth] = useState(new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const d = parse(value, 'yyyy-MM-dd', new Date())
      if (isValid(d)) {
        setSelected(d)
        setInputVal(format(d, 'dd/MM/yyyy'))
        setViewMonth(startOfMonth(d))
      }
    } else {
      setSelected(undefined)
      setInputVal('')
    }
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleDaySelect(day: Date) {
    setSelected(day)
    const iso = format(day, 'yyyy-MM-dd')
    setInputVal(format(day, 'dd/MM/yyyy'))
    onChange?.(iso)
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setInputVal(v)
    if (v.length === 10) {
      const d = parse(v, 'dd/MM/yyyy', new Date())
      if (isValid(d)) {
        setSelected(d)
        setViewMonth(startOfMonth(d))
        onChange?.(format(d, 'yyyy-MM-dd'))
      }
    }
  }

  const isoValue = selected && isValid(selected) ? format(selected, 'yyyy-MM-dd') : ''

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={inputVal}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{
          background: 'var(--theme-input-bg)',
          border: error ? '1px solid rgba(255,100,100,0.5)' : '1px solid var(--theme-input-border)',
          color: 'var(--theme-input-text)',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {name && <input type="hidden" name={name} value={isoValue} />}
      {error && <p className="text-xs" style={{ color: '#FF9090' }}>{error}</p>}

      {open && (
        <div
          className="absolute z-50 top-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: 'var(--theme-drawer-bg)',
            border: '1px solid var(--theme-input-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <CalendarGrid
            month={viewMonth}
            selected={selected}
            onSelect={handleDaySelect}
            onMonthChange={setViewMonth}
          />
        </div>
      )}
    </div>
  )
}

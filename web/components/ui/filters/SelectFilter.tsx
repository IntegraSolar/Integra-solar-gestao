'use client'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function SelectFilter({ value, onChange, options, placeholder = 'Todos', className }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{
        background: 'var(--theme-input-bg)',
        border: '1px solid var(--theme-input-border)',
        color: 'var(--theme-input-text)',
        borderRadius: 10,
        padding: '7px 12px',
        fontSize: 13,
        outline: 'none',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

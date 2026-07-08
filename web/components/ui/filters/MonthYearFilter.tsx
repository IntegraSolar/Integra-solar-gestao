'use client'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface Props {
  month: number
  year: number
  onChange: (params: { month: number; year: number }) => void
  yearsRange?: number  // qtos anos p/ trás e frente (padrão 2)
}

export function MonthYearFilter({ month, year, onChange, yearsRange = 2 }: Props) {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear - yearsRange; y <= currentYear + yearsRange; y++) years.push(y)

  const selectStyle: React.CSSProperties = {
    background: 'var(--theme-input-bg)',
    border: '1px solid var(--theme-input-border)',
    color: 'var(--theme-input-text)',
    borderRadius: 10,
    padding: '7px 12px',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <>
      <select
        value={month}
        onChange={(e) => onChange({ month: Number(e.target.value), year })}
        style={selectStyle}
      >
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange({ month, year: Number(e.target.value) })}
        style={selectStyle}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </>
  )
}

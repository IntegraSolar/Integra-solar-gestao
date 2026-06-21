import {
  formatCurrency, formatPhone, formatCpfCnpj, formatCEP,
  formatDate, formatPercent, formatKwp, formatKwh, formatNumber,
} from '@/lib/format'

type FormatType =
  | 'currency'
  | 'phone'
  | 'cpfCnpj'
  | 'cep'
  | 'date'
  | 'percent'
  | 'kwp'
  | 'kwh'
  | 'number'

interface FormatDisplayProps {
  type: FormatType
  value: string | number | null | undefined
  className?: string
  fallback?: string
}

export function FormatDisplay({ type, value, className, fallback = '—' }: FormatDisplayProps) {
  if (value == null || value === '') return <span className={className}>{fallback}</span>

  let formatted: string

  switch (type) {
    case 'currency':
      formatted = formatCurrency(value)
      break
    case 'phone':
      formatted = formatPhone(String(value))
      break
    case 'cpfCnpj':
      formatted = formatCpfCnpj(String(value))
      break
    case 'cep':
      formatted = formatCEP(String(value))
      break
    case 'date':
      formatted = formatDate(String(value))
      break
    case 'percent':
      formatted = formatPercent(value)
      break
    case 'kwp':
      formatted = formatKwp(value)
      break
    case 'kwh':
      formatted = formatKwh(value)
      break
    case 'number':
      formatted = formatNumber(value)
      break
    default:
      formatted = String(value)
  }

  return <span className={className}>{formatted}</span>
}

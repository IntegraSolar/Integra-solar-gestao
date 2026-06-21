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
  const cleaned = v
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function toISODate(v: string): string {
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

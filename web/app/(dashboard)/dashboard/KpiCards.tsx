'use client'

import type { KpiData } from '@/lib/dashboard/queries'
import { formatCurrency, formatKwp } from '@/lib/format'

export default function KpiCards({ kpi }: { kpi: KpiData }) {
  const cards = [
    { label: 'Qtd. Vendas', value: kpi.qtd_vendas.toString(), sub: 'no período', color: '#60a5fa' },
    { label: 'Valor Total', value: formatCurrency(kpi.valor_total), sub: 'no período', color: '#34d399' },
    { label: 'Potência (kWp)', value: formatKwp(kpi.potencia_kwp), sub: 'projetos vendidos', color: '#fbbf24' },
    { label: 'Ticket Médio', value: formatCurrency(kpi.ticket_medio), sub: 'por projeto', color: 'var(--theme-accent)' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-white/10 p-5"
          style={{ background: 'var(--theme-surface)', borderLeft: `3px solid ${c.color}` }}
        >
          <p className="text-xs text-white/50 uppercase tracking-wide mb-2">{c.label}</p>
          <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
          <p className="text-xs text-white/30 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

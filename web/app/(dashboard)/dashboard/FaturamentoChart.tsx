'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { FaturamentoMes } from '@/lib/dashboard/queries'

function formatCurrency(v: number) {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`
  return `R$ ${v.toFixed(0)}`
}

export default function FaturamentoChart({ data }: { data: FaturamentoMes[] }) {
  const anoAtual = new Date().getFullYear()
  const anoAnterior = anoAtual - 1
  return (
    <div
      className="rounded-2xl border border-white/10 p-5"
      style={{ background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/70">Faturamento Mensal</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--theme-accent)' }} />
            <span className="text-white/50">{anoAtual}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--theme-text-subtle)' }} />
            <span className="text-white/50">{anoAnterior}</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--theme-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), '']}
            contentStyle={{ background: 'var(--theme-drawer-bg)', border: '1px solid var(--theme-border)', borderRadius: 8, color: 'var(--theme-text)' }}
            labelStyle={{ color: 'var(--theme-text-muted)' }}
          />
          <Bar dataKey="ano_atual" name={String(anoAtual)} fill="var(--theme-accent)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ano_anterior" name={String(anoAnterior)} fill="var(--theme-text-subtle)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

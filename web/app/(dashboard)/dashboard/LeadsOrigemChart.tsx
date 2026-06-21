'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { LeadOrigemItem } from '@/lib/dashboard/queries'

const COLORS = ['#FFD080', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8']

export default function LeadsOrigemChart({ data }: { data: LeadOrigemItem[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div
      className="rounded-2xl border border-white/10 p-5 h-full"
      style={{ background: 'var(--theme-surface)' }}
    >
      <h2 className="text-sm font-semibold text-white/70 mb-1">Leads por Origem</h2>
      <p className="text-2xl font-bold text-white mb-4">{total}</p>
      {data.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-8">Nenhum dado</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{ background: 'var(--theme-drawer-bg)', border: '1px solid var(--theme-border)', borderRadius: 8, color: 'var(--theme-text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {d.name}
                </span>
                <span className="text-xs font-semibold text-white">{d.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

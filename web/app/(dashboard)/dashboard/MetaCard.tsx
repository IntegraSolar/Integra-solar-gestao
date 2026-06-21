'use client'

import type { MetaData } from '@/lib/dashboard/queries'
import { formatCurrency } from '@/lib/format'

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full rounded-full h-2" style={{ background: 'var(--theme-surface-hover)' }}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export default function MetaCard({ meta }: { meta: MetaData }) {
  const pctMes = meta.meta_mensal > 0 ? Math.min((meta.realizado_mes / meta.meta_mensal) * 100, 100) : 0
  const pctAno = meta.meta_anual > 0 ? Math.min((meta.realizado_ano / meta.meta_anual) * 100, 100) : 0
  const faltaMes = Math.max(meta.meta_mensal - meta.realizado_mes, 0)
  const faltaAno = Math.max(meta.meta_anual - meta.realizado_ano, 0)

  return (
    <div
      className="rounded-2xl border border-white/10 p-5"
      style={{ background: 'var(--theme-surface)' }}
    >
      <h2 className="text-sm font-semibold text-white/70 mb-4">Metas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta mensal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Meta Mensal</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-accent)' }}>{pctMes.toFixed(0)}%</span>
          </div>
          <ProgressBar value={meta.realizado_mes} max={meta.meta_mensal} color="#FFD080" />
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Realizado: {formatCurrency(meta.realizado_mes)}</span>
            <span>Meta: {formatCurrency(meta.meta_mensal)}</span>
          </div>
          {faltaMes > 0 && (
            <p className="text-xs text-white/30">Faltam {formatCurrency(faltaMes)} para atingir a meta</p>
          )}
          {faltaMes === 0 && meta.meta_mensal > 0 && (
            <p className="text-xs text-green-400">Meta mensal atingida!</p>
          )}
        </div>
        {/* Meta anual */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Meta Anual</span>
            <span className="text-xs font-semibold" style={{ color: '#34d399' }}>{pctAno.toFixed(0)}%</span>
          </div>
          <ProgressBar value={meta.realizado_ano} max={meta.meta_anual} color="#34d399" />
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Realizado: {formatCurrency(meta.realizado_ano)}</span>
            <span>Meta: {formatCurrency(meta.meta_anual)}</span>
          </div>
          {faltaAno > 0 && (
            <p className="text-xs text-white/30">Faltam {formatCurrency(faltaAno)} para atingir a meta</p>
          )}
          {faltaAno === 0 && meta.meta_anual > 0 && (
            <p className="text-xs text-green-400">Meta anual atingida!</p>
          )}
        </div>
      </div>
    </div>
  )
}

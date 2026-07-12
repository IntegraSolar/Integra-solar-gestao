'use client'

import { useState } from 'react'
import type { DREData } from '@/lib/financeiro/dre-queries'
import { formatCurrency, formatDate } from '@/lib/format'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart2, Plus } from 'lucide-react'
import Link from 'next/link'

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  instalacao: 'Instalação',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function MetricCard({ label, value, sub, positive, neutral }: { label: string; value: string; sub?: string; positive?: boolean; neutral?: boolean }) {
  const color = neutral ? 'var(--theme-text)' : positive ? '#4ade80' : '#f87171'
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--theme-text-subtle)' }}>{label}</span>
      <span className="text-2xl font-bold" style={{ color: neutral ? 'var(--theme-text)' : color }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>{sub}</span>}
    </div>
  )
}

function BarChart({ items }: { items: { category: string; total: number; pct: number }[] }) {
  const colors = ['#facc15', '#60a5fa', '#34d399', '#f472b6', '#fb923c', '#a78bfa', '#2dd4bf', '#f87171', '#94a3b8', '#fbbf24']
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.category} className="flex items-center gap-3">
          <span className="text-xs w-36 truncate" style={{ color: 'var(--theme-text-subtle)' }}>{item.category}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--theme-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: colors[i % colors.length] }} />
          </div>
          <span className="text-xs font-semibold w-24 text-right" style={{ color: 'var(--theme-text)' }}>{formatCurrency(item.total)}</span>
          <span className="text-xs w-10 text-right" style={{ color: 'var(--theme-text-subtle)' }}>{item.pct.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function DREClient({ data }: { data: DREData }) {
  const { client, costs, costsByCategory, totalCosts, grossProfit, commission, netProfit, margin, revenueGross } = data

  const chartItems = costsByCategory.map(c => ({
    ...c,
    pct: totalCosts > 0 ? (c.total / totalCosts) * 100 : 0,
  }))

  const isProfit = netProfit >= 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0 flex items-center gap-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <Link href="/financeiro/custos" className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--theme-text-subtle)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>DRE — {client.name}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
            {client.city ?? ''}{client.city ? ' · ' : ''}{STAGE_LABELS[client.pipeline_stage] ?? client.pipeline_stage}
            {client.contract_date ? ` · Contrato: ${formatDate(client.contract_date)}` : ''}
          </p>
        </div>
        <Link
          href={`/financeiro/custos?client=${client.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          <Plus size={13} /> Adicionar custo
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* Resultado geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Receita Bruta" value={formatCurrency(revenueGross)} neutral />
          <MetricCard label="Custos Totais" value={formatCurrency(totalCosts)} positive={false} />
          {commission > 0 && (
            <MetricCard label={`Comissão (${client.commission_pct}%)`} value={formatCurrency(commission)} positive={false} />
          )}
          <MetricCard label="Lucro Líquido" value={formatCurrency(netProfit)} positive={isProfit} />
          <MetricCard label="Margem" value={`${margin.toFixed(1)}%`} sub={isProfit ? 'lucro' : 'prejuízo'} positive={isProfit} />
          {client.payment_method && (
            <MetricCard label="Forma de pagamento" value={client.payment_method} neutral />
          )}
        </div>

        {/* DRE estruturado */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 py-3" style={{ background: 'var(--theme-surface)', borderBottom: '1px solid var(--theme-border)' }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
              <BarChart2 size={15} /> Demonstração do Resultado
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--theme-border)' }}>
            <DRERow label="(+) Receita da venda" value={revenueGross} bold />
            <DRERow label="(−) Custos do projeto" value={-totalCosts} />
            {commission > 0 && <DRERow label={`(−) Comissão ${client.commission_pct}%`} value={-commission} />}
            <DRERow label="Lucro líquido" value={netProfit} bold highlight={isProfit ? 'green' : 'red'} />
            <DRERow label="Margem de lucro" value={null} text={`${margin.toFixed(2)}%`} bold />
          </div>
        </div>

        {/* Breakdown por categoria */}
        {chartItems.length > 0 && (
          <div className="rounded-2xl border border-white/10 p-5 space-y-4" style={{ background: 'var(--theme-surface)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>Custos por categoria</h2>
            <BarChart items={chartItems} />
          </div>
        )}

        {/* Lista de custos */}
        {costs.length > 0 && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3" style={{ background: 'var(--theme-surface)', borderBottom: '1px solid var(--theme-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>Lançamentos ({costs.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-white/40">Data</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-white/40">Categoria</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-white/40">Descrição</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-white/40">Valor</th>
                </tr>
              </thead>
              <tbody>
                {costs.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                    <td className="px-4 py-2 text-white/50 whitespace-nowrap text-xs">{formatDate(c.cost_date)}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text-muted)' }}>{c.category}</span>
                    </td>
                    <td className="px-4 py-2 text-white/80 text-xs">{c.description}{c.notes && <span className="text-white/30 ml-2">({c.notes})</span>}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sm" style={{ color: 'var(--theme-accent)' }}>{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {costs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm" style={{ color: 'var(--theme-text-subtle)' }}>Nenhum custo registrado para este projeto ainda.</p>
            <Link
              href={`/financeiro/custos`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
            >
              <Plus size={12} /> Adicionar custo
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function DRERow({
  label,
  value,
  text,
  bold,
  highlight,
}: {
  label: string
  value: number | null
  text?: string
  bold?: boolean
  highlight?: 'green' | 'red'
}) {
  const displayValue = text ?? (value != null ? formatCurrency(Math.abs(value)) : '—')
  const color = highlight === 'green' ? '#4ade80' : highlight === 'red' ? '#f87171' : 'var(--theme-text)'
  return (
    <div className={`flex items-center justify-between px-5 py-3 ${bold ? 'font-semibold' : ''}`} style={{ color }}>
      <span className={`text-sm ${!bold ? 'text-white/60' : ''}`} style={bold ? { color } : {}}>{label}</span>
      <span className="text-sm">{displayValue}</span>
    </div>
  )
}

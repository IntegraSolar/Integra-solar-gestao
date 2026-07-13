'use client'

import type { DRESummary } from '@/lib/financeiro/dre-queries'
import { formatCurrency } from '@/lib/format'
import { ArrowLeft, BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default function DRESummaryClient({ summary }: { summary: DRESummary }) {
  const { totalRevenue, totalCosts, totalProfit, avgMargin, projectCount, mostProfitable, leastProfitable, projects } = summary

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex-shrink-0 flex items-center gap-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <Link href="/financeiro/custos" className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--theme-text-subtle)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
            <BarChart2 size={18} /> DRE — Visão Geral
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>{projectCount} projetos com dados de venda</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Receita Total', value: formatCurrency(totalRevenue), neutral: true },
            { label: 'Custos Totais', value: formatCurrency(totalCosts), pos: false },
            { label: 'Lucro Total', value: formatCurrency(totalProfit), pos: totalProfit >= 0 },
            { label: 'Margem Média', value: `${avgMargin.toFixed(1)}%`, pos: avgMargin >= 0 },
          ].map(card => (
            <div key={card.label} className="rounded-2xl p-5" style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--theme-text-subtle)' }}>{card.label}</p>
              <p className="text-xl font-bold" style={{ color: card.neutral ? 'var(--theme-text)' : card.pos ? '#4ade80' : '#f87171' }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Destaques */}
        {(mostProfitable || leastProfitable) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mostProfitable && (
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <TrendingUp size={20} className="text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-400/70">Mais lucrativo</p>
                  <p className="text-sm font-semibold text-green-300">{mostProfitable.name}</p>
                  <p className="text-xs text-green-400/70">{formatCurrency(mostProfitable.profit)}</p>
                </div>
              </div>
            )}
            {leastProfitable && (
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <TrendingDown size={20} className="text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-red-400/70">Menos lucrativo</p>
                  <p className="text-sm font-semibold text-red-300">{leastProfitable.name}</p>
                  <p className="text-xs text-red-400/70">{formatCurrency(leastProfitable.profit)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabela de projetos */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 py-3" style={{ background: 'var(--theme-surface)', borderBottom: '1px solid var(--theme-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>Projetos</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
                <th className="text-left px-4 py-2 text-xs font-semibold text-white/40">Projeto</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-white/40">Receita</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-white/40">Custos</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-white/40">Lucro</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-white/40">Margem</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--theme-text-subtle)' }}>
                    Nenhum projeto com dados financeiros registrados.
                  </td>
                </tr>
              )}
              {projects.map(p => {
                const isProfit = p.profit >= 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--theme-text)' }}>{p.name}</td>
                    <td className="px-4 py-3 text-right text-white/70 text-xs">{formatCurrency(p.revenue)}</td>
                    <td className="px-4 py-3 text-right text-red-400/80 text-xs">{formatCurrency(p.costs)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: isProfit ? '#4ade80' : '#f87171' }}>{formatCurrency(p.profit)}</td>
                    <td className="px-4 py-3 text-right text-xs" style={{ color: isProfit ? '#4ade80' : '#f87171' }}>{p.margin.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <Link href={`/financeiro/dre/${p.id}`} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--theme-accent)' }}>
                        Ver DRE
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'
import type { IndicadoresFinanceiros } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** Payback pode não existir dentro do horizonte — dizer isso é melhor que um traço. */
const payback = (v: number | null) => (v === null ? 'não se paga no horizonte' : `${n(v, 1)} anos`)

export function HibridoIndicadores({ indicadores }: { indicadores: IndicadoresFinanceiros }) {
  const blocos: { id: string; label: string; valor: string; destaque?: boolean }[] = [
    { id: 'ind-vpl', label: 'VPL (@ TMA)', valor: `R$ ${n(indicadores.vpl)}`, destaque: true },
    { id: 'ind-tir', label: 'TIR (a.a.)', valor: `${n(indicadores.tir * 100, 1)}%`, destaque: true },
    { id: 'ind-payback-simples', label: 'Payback simples', valor: payback(indicadores.paybackSimplesAnos), destaque: true },
    { id: 'ind-payback-descontado', label: 'Payback descontado', valor: payback(indicadores.paybackDescontadoAnos) },
    { id: 'ind-lcoe', label: 'LCOE', valor: `R$ ${n(indicadores.lcoe, 4)}/kWh` },
    { id: 'ind-economia-acumulada', label: 'Economia em 25 anos', valor: `R$ ${n(indicadores.economiaAcumulada, 0)}` },
    { id: 'ind-roi', label: 'ROI', valor: `${n(indicadores.roi, 2)}×` },
    { id: 'ind-vpl-investimento', label: 'VPL / investimento', valor: `${n(indicadores.indiceVplInvestimento, 2)}×` },
  ]

  return (
    <div className={CARD}>
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Indicadores de viabilidade</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {blocos.map((b) => (
          <div key={b.id}
            className={`rounded-lg border p-3 ${b.destaque ? 'border-[#f0d9a8] bg-[#fff9ef]' : 'border-[var(--theme-border,#e7e9f2)]'}`}>
            <p className="text-[11px] text-[var(--theme-text-muted,#7b8194)]">{b.label}</p>
            <p className="mt-0.5 text-sm font-bold text-[var(--theme-text,#1a2340)]" data-testid={b.id}>{b.valor}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'
import type { ResultadoEconomiaAno } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function HibridoResultadosEconomia({ economia }: { economia: ResultadoEconomiaAno }) {
  const linhas: { id: string; label: string; valor: string }[] = [
    { id: 'eco-autoconsumo', label: 'Energia compensada (autoconsumo)', valor: `${n(economia.autoconsumoKwh, 0)} kWh` },
    { id: 'eco-excedente', label: 'Excedente injetado', valor: `${n(economia.excedenteKwh, 0)} kWh` },
    { id: 'eco-tarifa', label: 'Tarifa no ano 1', valor: `R$ ${n(economia.tarifaAno, 4)}/kWh` },
    { id: 'eco-tusd', label: 'TUSD Fio B no ano 1', valor: `R$ ${n(economia.tusdAno, 4)}/kWh` },
    { id: 'eco-autoconsumo-rs', label: 'Economia por autoconsumo', valor: `R$ ${n(economia.economiaAutoconsumo)}` },
    { id: 'eco-credito', label: 'Crédito do excedente', valor: `R$ ${n(economia.creditoExcedente)}` },
    { id: 'eco-disponibilidade', label: '(−) Custo de disponibilidade', valor: `R$ ${n(economia.custoDisponibilidade)}` },
    { id: 'eco-liquida', label: 'Economia líquida (ano 1)', valor: `R$ ${n(economia.economiaLiquida)}` },
    { id: 'eco-mensal', label: 'Economia mensal média', valor: `R$ ${n(economia.economiaLiquida / 12)}` },
  ]

  return (
    <div className={CARD}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Economia no primeiro ano</h3>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {linhas.map((l) => (
          <div key={l.id} className="flex justify-between border-b border-[var(--theme-border,#f1f2f7)] py-1 text-xs">
            <dt className="text-[var(--theme-text-muted,#7b8194)]">{l.label}</dt>
            <dd className="font-medium tabular-nums text-[var(--theme-text,#1a2340)]" data-testid={l.id}>{l.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

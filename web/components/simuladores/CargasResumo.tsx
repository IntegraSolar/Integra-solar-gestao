'use client'
import type { ResultadoCargas } from '@/lib/simuladores/hibrido/types'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

type Bloco = { id: string; label: string; valor: string; unidade: string }

export function CargasResumo({ resumo }: { resumo: ResultadoCargas }) {
  const blocos: Bloco[] = [
    { id: 'consumo-diario', label: 'Consumo diário', valor: n(resumo.consumoDiarioKwh), unidade: 'kWh/dia' },
    { id: 'consumo-mensal', label: 'Consumo mensal', valor: n(resumo.consumoMensalKwh), unidade: 'kWh/mês' },
    { id: 'consumo-anual', label: 'Consumo anual', valor: n(resumo.consumoAnualKwh), unidade: 'kWh/ano' },
    { id: 'consumo-critico', label: 'Consumo das cargas críticas', valor: n(resumo.consumoDiarioCriticoKwh), unidade: 'kWh/dia' },
    { id: 'pot-conectada', label: 'Potência conectada', valor: n(resumo.potenciaConectadaW, 0), unidade: 'W' },
    { id: 'pot-simultanea', label: 'Potência simultânea', valor: n(resumo.potenciaSimultaneaW, 0), unidade: 'W' },
    { id: 'pot-partida', label: 'Potência de partida', valor: n(resumo.potenciaPartidaW, 0), unidade: 'W' },
    { id: 'pico-demanda', label: 'Pico de demanda (24 h)', valor: n(resumo.picoDemandaW, 0), unidade: 'W' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {blocos.map((b) => (
        <div key={b.id} className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-3">
          <p className="text-[11px] text-[var(--theme-text-muted,#7b8194)]">{b.label}</p>
          <p className="mt-0.5 text-lg font-bold text-[var(--theme-text,#1a2340)]" data-testid={b.id}>
            {b.valor}
          </p>
          <p className="text-[10px] text-[var(--theme-text-muted,#9aa0b0)]">{b.unidade}</p>
        </div>
      ))}
    </div>
  )
}

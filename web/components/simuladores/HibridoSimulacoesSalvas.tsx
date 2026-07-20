'use client'
import type { SimulacaoResumo } from '@/lib/simuladores/hibrido/simulacoes-schemas'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** `null` significa que não se paga no horizonte — mostrar 0 seria o oposto. */
const payback = (v: number | null) => (v === null ? 'não se paga' : `${n(v, 1)} anos`)

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

type Props = {
  simulacoes: SimulacaoResumo[]
  onReabrir: (id: string) => void
  onExcluir: (id: string) => void
}

export function HibridoSimulacoesSalvas({ simulacoes, onReabrir, onExcluir }: Props) {
  if (simulacoes.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">
        Simulações salvas ({simulacoes.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
              <th className="p-1">Nome</th>
              <th className="p-1">Cliente</th>
              <th className="p-1 text-right">kWp</th>
              <th className="p-1 text-right">Investimento</th>
              <th className="p-1 text-right">VPL</th>
              <th className="p-1 text-right">TIR</th>
              <th className="p-1 text-right">Payback</th>
              <th className="p-1">Data</th>
              <th className="p-1"></th>
            </tr>
          </thead>
          <tbody>
            {simulacoes.map((s) => (
              <tr key={s.id} className="border-t border-[var(--theme-border,#f1f2f7)]">
                <td className="p-1 font-medium">{s.nome}</td>
                <td className="p-1">{s.clienteNome ?? '—'}</td>
                <td className="p-1 text-right tabular-nums">{n(s.potenciaKwp)}</td>
                <td className="p-1 text-right tabular-nums">R$ {n(s.investimentoTotal)}</td>
                <td className="p-1 text-right tabular-nums">R$ {n(s.vpl)}</td>
                <td className="p-1 text-right tabular-nums">{n(s.tir * 100, 1)}%</td>
                <td className="p-1 text-right tabular-nums" data-testid={`sim-payback-${s.id}`}>
                  {payback(s.paybackAnos)}
                </td>
                <td className="p-1">{data(s.createdAt)}</td>
                <td className="p-1 whitespace-nowrap">
                  <button type="button" className="mr-3 text-[#3b6fd6]"
                    data-testid={`btn-reabrir-${s.id}`} onClick={() => onReabrir(s.id)}>reabrir</button>
                  <button type="button" className="text-[#c0392b]"
                    data-testid={`btn-excluir-${s.id}`} onClick={() => onExcluir(s.id)}>excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

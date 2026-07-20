'use client'
import type { ResultadoCapex } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const qtd = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function HibridoResultadosCapex({ capex }: { capex: ResultadoCapex }) {
  const totais: { id: string; label: string; valor: number; forte?: boolean }[] = [
    { id: 'capex-custo-direto', label: 'Custo direto', valor: capex.custoDireto },
    { id: 'capex-bdi', label: 'BDI', valor: capex.valorBdi },
    { id: 'capex-com-bdi', label: 'Custo com BDI', valor: capex.custoComBdi },
    { id: 'capex-margem', label: 'Margem de lucro', valor: capex.valorMargem },
    { id: 'capex-impostos', label: 'Impostos', valor: capex.valorImpostos },
    { id: 'capex-investimento-total', label: 'Investimento total', valor: capex.investimentoTotal, forte: true },
    { id: 'capex-por-kwp', label: 'Investimento por kWp', valor: capex.investimentoPorKwp },
  ]

  return (
    <div className={CARD}>
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Investimento (CAPEX)</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
              <th className="p-1">Item</th>
              <th className="p-1 text-right">Qtd</th>
              <th className="p-1 text-right">Custo unit. (R$)</th>
              <th className="p-1 text-right">Subtotal (R$)</th>
            </tr>
          </thead>
          <tbody>
            {capex.itens.map((i) => (
              <tr key={i.descricao} data-testid={`capex-item-${i.descricao}`}
                className="border-t border-[var(--theme-border,#f1f2f7)]">
                <td className="p-1">{i.descricao}</td>
                <td className="p-1 text-right tabular-nums">{qtd(i.quantidade)}</td>
                <td className="p-1 text-right tabular-nums">{brl(i.custoUnitario)}</td>
                <td className="p-1 text-right tabular-nums">{brl(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {totais.map((t) => (
          <div key={t.id}
            className={`flex justify-between border-b border-[var(--theme-border,#f1f2f7)] py-1 text-xs ${t.forte ? 'font-bold' : ''}`}>
            <dt className={t.forte ? 'text-[var(--theme-text,#1a2340)]' : 'text-[var(--theme-text-muted,#7b8194)]'}>{t.label}</dt>
            <dd className="tabular-nums text-[var(--theme-text,#1a2340)]" data-testid={t.id}>R$ {brl(t.valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

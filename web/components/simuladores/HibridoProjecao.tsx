'use client'
import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import type { LinhaProjecaoFinanceira } from '@/lib/simuladores/hibrido/types'

const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'
const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function HibridoProjecao({ projecao }: { projecao: LinhaProjecaoFinanceira[] }) {
  const [tabelaAberta, setTabelaAberta] = useState(false)

  const data = projecao.map((l) => ({
    ano: l.ano,
    acumulado: l.fluxoAcumulado,
    vplAcumulado: l.vplAcumulado,
  }))

  return (
    <div className={CARD} data-testid="projecao">
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">
        Projeção de fluxo de caixa
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
          <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={80}
            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} />
          <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#9aa0b0" />
          <Line type="monotone" dataKey="acumulado" name="Fluxo acumulado" stroke="#FF9F40" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="vplAcumulado" name="VPL acumulado" stroke="#3b6fd6" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <button type="button" data-testid="btn-toggle-tabela-projecao"
        onClick={() => setTabelaAberta((a) => !a)}
        className="mt-3 text-xs font-semibold text-[#3b6fd6]">
        {tabelaAberta ? '▾' : '▸'} Tabela ano a ano
      </button>

      {tabelaAberta && (
        <div className="mt-2 overflow-x-auto" data-testid="tabela-projecao">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
                <th className="p-1">Ano</th>
                <th className="p-1 text-right">Geração (kWh)</th>
                <th className="p-1 text-right">Economia (R$)</th>
                <th className="p-1 text-right">O&amp;M (R$)</th>
                <th className="p-1 text-right">Fluxo líq. (R$)</th>
                <th className="p-1 text-right">Acumulado (R$)</th>
                <th className="p-1 text-right">Descontado (R$)</th>
                <th className="p-1 text-right">VPL acum. (R$)</th>
              </tr>
            </thead>
            <tbody>
              {projecao.map((l) => (
                <tr key={l.ano} className="border-t border-[var(--theme-border,#f1f2f7)] tabular-nums">
                  <td className="p-1">{l.ano}</td>
                  <td className="p-1 text-right">{n(l.geracaoKwh, 0)}</td>
                  <td className="p-1 text-right">{n(l.economiaLiquida)}</td>
                  <td className="p-1 text-right">{n(l.custoOm)}</td>
                  <td className="p-1 text-right">{n(l.fluxoLiquido)}</td>
                  <td className="p-1 text-right">{n(l.fluxoAcumulado)}</td>
                  <td className="p-1 text-right">{n(l.fluxoDescontado)}</td>
                  <td className="p-1 text-right">{n(l.vplAcumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function HibridoProducaoMensal({ producaoMensalKwh }: { producaoMensalKwh: number[] }) {
  const data = producaoMensalKwh.map((kwh, i) => ({ mes: MESES[i] ?? String(i), kwh }))
  const temProducao = producaoMensalKwh.some((v) => v > 0)

  return (
    <div
      className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4"
      data-testid="producao-mensal"
    >
      <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Produção mensal estimada (kWh)</h3>
      {!temProducao ? (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Selecione o painel e informe a irradiação para ver a produção.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={60} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`, 'Produção']} />
            <Bar dataKey="kwh" fill="#FF9F40" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

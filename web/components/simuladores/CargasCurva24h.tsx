'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function CargasCurva24h({ curva }: { curva: number[] }) {
  const data = curva.map((w, h) => ({ hora: `${String(h).padStart(2, '0')}h`, w }))
  const temCarga = curva.some((w) => w > 0)

  return (
    <div
      className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4"
      data-testid="curva-24h"
    >
      <h3 className="text-sm font-semibold text-[var(--theme-text,#1a2340)]">Curva de demanda (24 h)</h3>
      <p className="mb-3 text-xs text-[var(--theme-text-muted,#7b8194)]">
        Soma das cargas ativas em cada hora, a partir dos horários de início e fim.
      </p>
      {!temCarga ? (
        <p className="py-8 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Nenhuma carga no levantamento ainda.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
            <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 10 }} unit=" W" width={70} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString('pt-BR')} W`, 'Demanda']} />
            <Bar dataKey="w" fill="#FF9F40" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

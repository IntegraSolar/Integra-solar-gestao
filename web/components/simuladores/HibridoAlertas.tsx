'use client'
import type { Alerta, SeveridadeAlerta } from '@/lib/simuladores/hibrido/types'

const ESTILO: Record<SeveridadeAlerta, { cor: string; icone: string }> = {
  erro: { cor: 'border-[#f0b4ab] bg-[#fdf0ee] text-[#c0392b]', icone: '✕' },
  aviso: { cor: 'border-[#f0d9a8] bg-[#fff6e6] text-[#b26b00]', icone: '!' },
  ok: { cor: 'border-[#bce8ce] bg-[#f0fbf4] text-[#1f9d55]', icone: '✓' },
}

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

const plural = (q: number, sing: string, plur: string) => `${q} ${q === 1 ? sing : plur}`

export function HibridoAlertas({ alertas }: { alertas: Alerta[] }) {
  const erros = alertas.filter((a) => a.severidade === 'erro').length
  const avisos = alertas.filter((a) => a.severidade === 'aviso').length

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--theme-text,#1a2340)]">Verificações normativas</h3>
        <span className="text-xs text-[var(--theme-text-muted,#7b8194)]" data-testid="alertas-resumo">
          {plural(erros, 'erro', 'erros')} · {plural(avisos, 'aviso', 'avisos')}
        </span>
      </div>

      {alertas.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Nenhuma verificação disponível ainda.
        </p>
      ) : (
        <ul className="space-y-1">
          {alertas.map((a) => {
            const e = ESTILO[a.severidade]
            return (
              <li key={a.codigo} data-testid={`alerta-${a.codigo}`} data-severidade={a.severidade}
                className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs ${e.cor}`}>
                <span aria-hidden className="font-bold">{e.icone}</span>
                <span className="flex-1">
                  {a.mensagem}
                  {a.valor !== undefined && a.limite !== undefined && (
                    <span className="opacity-70"> ({n(a.valor)} / limite {n(a.limite)})</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

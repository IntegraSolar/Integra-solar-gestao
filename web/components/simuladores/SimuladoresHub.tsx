import Link from 'next/link'
import { SIMULADORES } from '@/lib/simuladores/registry'

export function SimuladoresHub() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simuladores</h1>
        <span className="text-[10px] font-extrabold tracking-wide bg-[#FF9F40] text-[#1a1a1a] rounded px-1.5 py-0.5">PRO</span>
      </div>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-5">
        Escolha uma ferramenta para gerar uma simulação.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SIMULADORES.map((s) => {
          const disponivel = s.status === 'disponivel'
          const construcao = s.status === 'em_construcao'
          const clicavel = disponivel || construcao
          const card = (
            <div
              className={`h-full rounded-xl border p-4 text-left transition-colors ${
                clicavel
                  ? 'border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] hover:border-[#FF9F40]'
                  : 'border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{s.icone}</span>
                <span
                  className={`text-[9px] rounded px-1.5 py-0.5 border ${
                    disponivel
                      ? 'text-[#1f9d55] border-[#bce8ce] bg-[#f0fbf4]'
                      : construcao
                        ? 'text-[#b26b00] border-[#f0d9a8] bg-[#fff6e6]'
                        : 'text-[#9aa0b0] border-[#e0e3ee]'
                  }`}
                >
                  {disponivel ? 'disponível' : construcao ? 'em construção' : 'em breve'}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">{s.titulo}</h3>
              <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">{s.descricao}</p>
            </div>
          )
          return clicavel ? (
            <Link key={s.slug} href={`/simuladores/${s.slug}`} className="block h-full">{card}</Link>
          ) : (
            <div key={s.slug} aria-disabled className="cursor-default">{card}</div>
          )
        })}
      </div>
    </div>
  )
}

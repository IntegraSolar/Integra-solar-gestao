import { Lock } from 'lucide-react'

export function SimuladoresLocked() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simuladores</h1>
        <span className="text-[10px] font-extrabold tracking-wide bg-[#FF9F40] text-[#1a1a1a] rounded px-1.5 py-0.5">PRO</span>
      </div>

      <div className="max-w-xl rounded-2xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3E6]">
          <Lock size={22} className="text-[#FF9F40]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--theme-text,#1a2340)]">Recurso do plano superior</h2>
        <p className="mt-2 text-sm text-[var(--theme-text-muted,#6b7280)]">
          As ferramentas de simulação estão disponíveis para empresas com o recurso liberado.
          Fale com a Integra Solar para habilitar os Simuladores na sua conta.
        </p>
      </div>
    </div>
  )
}

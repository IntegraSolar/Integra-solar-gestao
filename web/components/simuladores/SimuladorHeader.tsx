'use client'

// Andaime compartilhado da fundação: cabeçalho reutilizável (título/cliente/descrição)
// que os simuladores vão consumir. Intencionalmente SEM uso ainda — o primeiro
// simulador construído será o primeiro consumidor. Não é código órfão.

export type SimuladorHeaderValues = {
  titulo: string
  cliente: string
  descricao: string
}

export function SimuladorHeader({
  values,
  onChange,
}: {
  values: SimuladorHeaderValues
  onChange: (v: SimuladorHeaderValues) => void
}) {
  const set = (patch: Partial<SimuladorHeaderValues>) => onChange({ ...values, ...patch })
  const inputCls =
    'w-full rounded-lg border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] px-3 py-2 text-sm text-[var(--theme-text,#1a2340)] outline-none focus:border-[#FF9F40]'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-text-muted,#9aa0b0)] mb-1'

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className={labelCls}>Título da simulação</label>
          <input
            className={inputCls}
            value={values.titulo}
            onChange={(e) => set({ titulo: e.target.value })}
            placeholder="Ex.: Simulação João Silva"
          />
        </div>
        <div>
          <label className={labelCls}>Nome do cliente</label>
          <input
            className={inputCls}
            value={values.cliente}
            onChange={(e) => set({ cliente: e.target.value })}
            placeholder="Ex.: João Silva"
          />
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input
            className={inputCls}
            value={values.descricao}
            onChange={(e) => set({ descricao: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </div>
    </div>
  )
}

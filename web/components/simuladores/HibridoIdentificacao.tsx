'use client'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

/** Texto livre: nenhum destes campos entra em cálculo. */
export type Identificacao = {
  nome: string
  clienteNome: string
  clienteCidade: string
  clienteUf: string
  concessionaria: string
  responsavelTecnico: string
}

export const IDENTIFICACAO_INICIAL: Identificacao = {
  nome: '',
  clienteNome: '',
  clienteCidade: '',
  clienteUf: '',
  concessionaria: '',
  responsavelTecnico: '',
}

const CAMPOS: { key: keyof Identificacao; label: string }[] = [
  { key: 'nome', label: 'Nome da simulação' },
  { key: 'clienteNome', label: 'Cliente' },
  { key: 'clienteCidade', label: 'Cidade' },
  { key: 'clienteUf', label: 'UF' },
  { key: 'concessionaria', label: 'Concessionária' },
  { key: 'responsavelTecnico', label: 'Responsável técnico' },
]

type Props = { identificacao: Identificacao; onChange: (i: Identificacao) => void }

export function HibridoIdentificacao({ identificacao, onChange }: Props) {
  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Identificação</h2>
      <p className="mb-3 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Não entra em nenhum cálculo — serve para nomear a simulação salva e identificar a proposta.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CAMPOS.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input
              className={IN}
              data-testid={`ident-${c.key}`}
              value={identificacao[c.key]}
              onChange={(e) => onChange({ ...identificacao, [c.key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

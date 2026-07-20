'use client'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

export const TIPOS_LIGACAO = ['', 'Monofásico', 'Bifásico', 'Trifásico'] as const

/**
 * Identificação + dados descritivos do projeto. Texto livre: NENHUM destes
 * campos entra em cálculo — servem para nomear a simulação salva e preencher o
 * Memorial descritivo. Ficam em colunas do banco, fora do snapshot.
 */
export type DadosProjeto = {
  // Identificação
  nome: string
  clienteNome: string
  clienteCidade: string
  clienteUf: string
  concessionaria: string
  responsavelTecnico: string
  // Descritivos (Memorial)
  azimute: string
  inclinacao: string
  latitude: string
  longitude: string
  altitude: string
  tipoLigacao: string
  tensaoNominal: string
  modoOperacao: string
}

export const DADOS_PROJETO_INICIAL: DadosProjeto = {
  nome: '', clienteNome: '', clienteCidade: '', clienteUf: '',
  concessionaria: '', responsavelTecnico: '',
  azimute: '', inclinacao: '', latitude: '', longitude: '', altitude: '',
  tipoLigacao: '', tensaoNominal: '', modoOperacao: '',
}

const IDENTIFICACAO: { key: keyof DadosProjeto; label: string }[] = [
  { key: 'nome', label: 'Nome da simulação' },
  { key: 'clienteNome', label: 'Cliente' },
  { key: 'clienteCidade', label: 'Cidade' },
  { key: 'clienteUf', label: 'UF' },
  { key: 'concessionaria', label: 'Concessionária' },
  { key: 'responsavelTecnico', label: 'Responsável técnico' },
]

const DESCRITIVOS: { key: keyof DadosProjeto; label: string }[] = [
  { key: 'azimute', label: 'Azimute (°)' },
  { key: 'inclinacao', label: 'Inclinação (°)' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'altitude', label: 'Altitude (m)' },
  { key: 'tensaoNominal', label: 'Tensão nominal (V)' },
  { key: 'modoOperacao', label: 'Modo de operação' },
]

type Props = { dados: DadosProjeto; onChange: (d: DadosProjeto) => void }

export function HibridoIdentificacao({ dados, onChange }: Props) {
  const set = (key: keyof DadosProjeto, valor: string) => onChange({ ...dados, [key]: valor })

  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Identificação</h2>
      <p className="mb-3 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Não entra em nenhum cálculo — serve para nomear a simulação salva e identificar a proposta.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {IDENTIFICACAO.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input className={IN} data-testid={`ident-${c.key}`}
              value={dados[c.key]} onChange={(e) => set(c.key, e.target.value)} />
          </label>
        ))}
      </div>

      <h3 className="mt-5 text-xs font-semibold text-[var(--theme-text,#1a2340)]">Dados do projeto</h3>
      <p className="mb-2 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Usados apenas no Memorial descritivo. Campos em branco saem como “—” no documento.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DESCRITIVOS.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input className={IN} data-testid={`ident-${c.key}`}
              value={dados[c.key]} onChange={(e) => set(c.key, e.target.value)} />
          </label>
        ))}
        <label className="text-[11px]">Tipo de ligação
          <select className={IN} data-testid="ident-tipoLigacao"
            value={dados.tipoLigacao} onChange={(e) => set('tipoLigacao', e.target.value)}>
            {TIPOS_LIGACAO.map((t) => (
              <option key={t} value={t}>{t === '' ? '— selecione —' : t}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

'use client'
import type { CamposFinanceiro } from '@/lib/simuladores/hibrido/montar-financeiro'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type Campo = { key: keyof CamposFinanceiro; label: string; placeholder?: string }

const TARIFAS: Campo[] = [
  { key: 'tarifaKwh', label: 'Tarifa cheia (R$/kWh)', placeholder: 'ex.: 1,22' },
  { key: 'tusdFioBKwh', label: 'TUSD Fio B (R$/kWh)', placeholder: 'ex.: 0,36' },
  { key: 'disponibilidadeKwhMes', label: 'Disponibilidade (kWh/mês)', placeholder: 'ex.: 100' },
]

const PRECOS: Campo[] = [
  { key: 'moduloUnitario', label: 'Módulo (R$/un.)' },
  { key: 'inversorUnitario', label: 'Inversor (R$/un.)' },
  { key: 'bateriaUnitaria', label: 'Bateria (R$/un.)' },
  { key: 'estruturaPorModulo', label: 'Estrutura (R$/módulo)' },
  { key: 'cabeamentoPorKwp', label: 'Cabeamento (R$/kWp)' },
  { key: 'projetoArt', label: 'Projeto e ART (R$)' },
  { key: 'maoDeObraPorKwp', label: 'Mão de obra (R$/kWp)' },
  { key: 'freteImprevistos', label: 'Frete e imprevistos (R$)' },
]

const PRECO_VENDA: Campo[] = [
  { key: 'bdi', label: 'BDI (fração)' },
  { key: 'margemLucro', label: 'Margem de lucro (fração)' },
  { key: 'impostos', label: 'Impostos (fração)' },
]

const MODELO: Campo[] = [
  { key: 'tma', label: 'TMA (fração a.a.)' },
  { key: 'inflacaoTarifa', label: 'Inflação da tarifa (fração a.a.)' },
  { key: 'degradacaoAnual', label: 'Degradação anual (fração)' },
  { key: 'omAnual', label: 'O&M anual (fração do CAPEX)' },
  { key: 'horizonteAnos', label: 'Horizonte (anos)' },
]

type Props = { campos: CamposFinanceiro; onChange: (c: CamposFinanceiro) => void }

export function HibridoInputsFinanceiro({ campos, onChange }: Props) {
  const set = (key: keyof CamposFinanceiro, valor: string) => onChange({ ...campos, [key]: valor })

  const grupo = (titulo: string, lista: Campo[], cols: string) => (
    <div className="mt-4 first:mt-0">
      <h3 className="text-xs font-semibold text-[var(--theme-text,#1a2340)]">{titulo}</h3>
      <div className={`mt-2 grid gap-3 ${cols}`}>
        {lista.map((c) => (
          <label key={c.key} className="text-[11px]">{c.label}
            <input
              className={IN}
              data-testid={`fin-${c.key}`}
              placeholder={c.placeholder}
              value={campos[c.key]}
              onChange={(e) => set(c.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Financeiro</h2>
      <p className="mb-2 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Campos em branco usam o valor padrão. As tarifas não têm padrão — informe as da concessionária do cliente.
      </p>

      {grupo('Tarifas', TARIFAS, 'sm:grid-cols-3')}
      {grupo('Preços do CAPEX', PRECOS, 'sm:grid-cols-3 lg:grid-cols-4')}
      {grupo('Formação de preço', PRECO_VENDA, 'sm:grid-cols-3')}
      {grupo('Modelo financeiro', MODELO, 'sm:grid-cols-3 lg:grid-cols-5')}

      <div className="mt-4 max-w-40">
        <label className="text-[11px]">Ano de conexão
          <input
            type="text"
            inputMode="numeric"
            min="2023"
            className={IN}
            data-testid="fin-anoConexao"
            value={campos.anoConexao}
            onChange={(e) => set('anoConexao', e.target.value)}
          />
        </label>
        <p className="mt-1 text-[10px] text-[var(--theme-text-muted,#9aa0b0)]">
          Define a rampa do Fio B (Lei 14.300).
        </p>
      </div>
    </div>
  )
}

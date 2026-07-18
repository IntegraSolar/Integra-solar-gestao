export type SimuladorStatus = 'disponivel' | 'em_construcao' | 'em_breve'

export type SimuladorInfo = {
  slug: string
  titulo: string
  descricao: string
  icone: string // emoji exibido no card do hub
  status: SimuladorStatus
}

// Fundação: todos "em_breve". Cada simulador vira 'disponivel' quando construído.
export const SIMULADORES: SimuladorInfo[] = [
  { slug: 'viabilidade-usina',       titulo: 'Viabilidade de usina', descricao: 'ROI de usina de investimento',            icone: '📊', status: 'disponivel' },
  { slug: 'hibrido-offgrid',         titulo: 'Híbrido / Off-grid',   descricao: 'Dimensionamento e autonomia de baterias', icone: '🔋', status: 'em_construcao' },
  { slug: 'conta-pos-instalacao',    titulo: 'Conta pós-instalação', descricao: 'Lei 14.300 e payback',                    icone: '⚡', status: 'em_breve' },
  { slug: 'parcelamento-cartao',     titulo: 'Parcelamento no cartão', descricao: 'Simula parcelas no cartão',             icone: '💳', status: 'disponivel' },
  { slug: 'financiamento',           titulo: 'Financiamento',        descricao: 'Parcela e juros',                         icone: '🏦', status: 'em_breve' },
  { slug: 'comparativo-concorrente', titulo: 'Comparativo',          descricao: 'Vs. proposta concorrente',                icone: '⚖️', status: 'em_breve' },
]

export function getSimulador(slug: string): SimuladorInfo | undefined {
  return SIMULADORES.find(s => s.slug === slug)
}

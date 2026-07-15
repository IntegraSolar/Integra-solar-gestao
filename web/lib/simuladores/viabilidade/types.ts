// web/lib/simuladores/viabilidade/types.ts
export type ModalidadeGD = 'GD1' | 'GD2' | 'GD3'

export type ViabilidadeInput = {
  numPaineis: number
  potenciaPainelWp: number
  numInversores: number
  potenciaInversorKw: number
  fatorCapacidade: number
  modalidade: ModalidadeGD
  tusdFioB: number
  tarifaDemanda: number            // usada só no cenário mini (col W)
  valorInvestimento: number
  tarifaLocacaoBase: number
  reajusteTarifaAnual: number
  degradacaoAnual: number
  tma: number
  descontoLocacao: number
  opexPct: number
  impostoPct: number
  d23: number                      // fator de gestão (0.125 no cenário)
  sunneSetupMicro: number          // 5000
  sunneSetupMini: number           // 10000
  pctFinanciado: number
  jurosAnual: number
  prazoMeses: number
  fioBSchedule: number[]           // [0.6,0.75,0.9,1,1,...]
  horizonteAnos: number            // 25
  anoInicial: number               // 2025
}

export type LinhaProjecao = {
  ano: number
  producaoKwh: number
  tarifaLiquida: number
  receitaBruta: number
  prestacao: number
  opex: number
  imposto: number
  fluxoProprio: number
  fluxoProprioAcum: number
  fluxoFinanciado: number
  fluxoFinanciadoAcum: number
}

export type MetricasCenario = { tir: number; vpl: number; paybackAnos: number }

export type ViabilidadeResultado = {
  kwp: number
  geracaoAnualKwh: number
  tipoUsina: 'Microusina' | 'Miniusina'
  projecao: LinhaProjecao[]
  capitalProprio: MetricasCenario
  comFinanciamento: MetricasCenario
}

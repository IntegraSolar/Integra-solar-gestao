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
  carenciaMeses: number            // carência (C49, ex.: 6) — escala os juros do ano 0
  amortizacaoAnos: number          // amortização em anos (C50, ex.: 12) — SAC
  fioBSchedule: number[]           // [0.6,0.75,0.9,1,1,...]
  horizonteAnos: number            // 25
  anoInicial: number               // 2025
}

// Uma linha da projeção reproduz as colunas F..AE da aba "Viabilidade" da
// planilha. Valores de custo são negativos (como na planilha).
export type LinhaProjecao = {
  ano: number
  producaoKwh: number              // F
  tarifaBruta: number              // G — Tarifa de Locação Bruta (R$/kWh)
  fioBPct: number                  // H — % da TUSD Fio B aplicada
  tusdFioB: number                 // I — TUSD Fio B (R$/kWh)
  tusdNaoCompensavel: number       // M — Tarifa Não Compensável Total de TUSD
  tarifaLiquida: number            // N
  receitaBruta: number             // O
  saldoDevedor: number             // R (negativo)
  prestacao: number                // S = amortização + juros (negativo)
  amortizacao: number              // T (negativo)
  juros: number                    // U (negativo)
  custoDisponibilidade: number     // V — micro (negativo); não entra no fluxo
  demandaGeracao: number           // W — mini (negativo)
  arrendamento: number             // X (negativo)
  opex: number                     // Y (negativo)
  gestao: number                   // Z — SUNNE ADM (negativo)
  imposto: number                  // AA (negativo)
  fluxoProprio: number             // AB
  fluxoProprioAcum: number         // AC
  fluxoFinanciado: number          // AD
  fluxoFinanciadoAcum: number      // AE
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

// web/lib/simuladores/hibrido/montar-financeiro.ts
// Ponte pura entre os campos financeiros da tela e o input do motor financeiro.
import { fioBSchedule } from '../fio-b'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from './premissas'
import type { FisicoParaFinanceiro, ResultadoHibrido } from './types'
import type { ParamsFinanceiro } from './financeiro'

/** Campos financeiros da tela. Todos `string`: em branco = usar o padrão. */
export type CamposFinanceiro = {
  // Tarifas — sem padrão possível, variam por concessionária
  tarifaKwh: string
  tusdFioBKwh: string
  disponibilidadeKwhMes: string
  // Preços do CAPEX
  moduloUnitario: string
  inversorUnitario: string
  bateriaUnitaria: string
  estruturaPorModulo: string
  cabeamentoPorKwp: string
  projetoArt: string
  maoDeObraPorKwp: string
  freteImprevistos: string
  // Formação de preço
  bdi: string
  margemLucro: string
  impostos: string
  // Modelo
  tma: string
  inflacaoTarifa: string
  degradacaoAnual: string
  omAnual: string
  horizonteAnos: string
  anoConexao: string
}

/**
 * Estado inicial. É função, não constante: o ano de conexão vem de fora, para
 * o módulo não depender do relógio no momento do import (o que tornaria os
 * testes dependentes da data).
 */
export function camposFinanceiroIniciais(anoConexao: number): CamposFinanceiro {
  const p = PRECOS_CAPEX_PADRAO
  const f = PREMISSAS_FINANCEIRAS_PADRAO
  return {
    tarifaKwh: '',
    tusdFioBKwh: '',
    disponibilidadeKwhMes: '',
    moduloUnitario: String(p.moduloUnitario),
    inversorUnitario: String(p.inversorUnitario),
    bateriaUnitaria: String(p.bateriaUnitaria),
    estruturaPorModulo: String(p.estruturaPorModulo),
    cabeamentoPorKwp: String(p.cabeamentoPorKwp),
    projetoArt: String(p.projetoArt),
    maoDeObraPorKwp: String(p.maoDeObraPorKwp),
    freteImprevistos: String(p.freteImprevistos),
    bdi: String(f.bdi),
    margemLucro: String(f.margemLucro),
    impostos: String(f.impostos),
    tma: String(f.tma),
    inflacaoTarifa: String(f.inflacaoTarifa),
    degradacaoAnual: String(f.degradacaoAnual),
    omAnual: String(f.omAnual),
    horizonteAnos: String(f.horizonteAnos),
    anoConexao: String(anoConexao),
  }
}

/**
 * Extrai do resultado físico os seis números que o motor financeiro consome.
 * Isolado e testado porque um campo trocado aqui não quebra nada visível —
 * apenas produz um CAPEX errado em silêncio.
 */
export function fisicoParaFinanceiro(r: ResultadoHibrido): FisicoParaFinanceiro {
  return {
    numModulos: r.dimensionamento.numModulos,
    numInversores: r.inversor.numInversoresParalelo,
    numBaterias: r.baterias.numBaterias,
    potenciaInstaladaKwp: r.dimensionamento.potenciaInstaladaKwp,
    producaoAnualKwh: r.dimensionamento.producaoAnualKwh,
    consumoAnualKwh: r.cargas.consumoAnualKwh,
  }
}

/** Campo em branco ou inválido usa o padrão; `'0'` digitado é respeitado. */
function numOu(v: string, padrao: number): number {
  const t = v.trim()
  if (t === '') return padrao
  const n = Number(t)
  return Number.isFinite(n) ? n : padrao
}

export function montarFinanceiroInput(
  campos: CamposFinanceiro,
  fisico: FisicoParaFinanceiro
): ParamsFinanceiro {
  const p = PRECOS_CAPEX_PADRAO
  const f = PREMISSAS_FINANCEIRAS_PADRAO
  const horizonteAnos = numOu(campos.horizonteAnos, f.horizonteAnos)
  const anoConexao = numOu(campos.anoConexao, new Date().getFullYear())

  return {
    fisico,
    tarifas: {
      // Sem padrão: tarifa varia por concessionária. Vazio vira 0, e a tela
      // suprime os resultados financeiros nesse caso.
      tarifaKwh: numOu(campos.tarifaKwh, 0),
      tusdFioBKwh: numOu(campos.tusdFioBKwh, 0),
      disponibilidadeKwhMes: numOu(campos.disponibilidadeKwhMes, 0),
    },
    precos: {
      moduloUnitario: numOu(campos.moduloUnitario, p.moduloUnitario),
      inversorUnitario: numOu(campos.inversorUnitario, p.inversorUnitario),
      bateriaUnitaria: numOu(campos.bateriaUnitaria, p.bateriaUnitaria),
      estruturaPorModulo: numOu(campos.estruturaPorModulo, p.estruturaPorModulo),
      cabeamentoPorKwp: numOu(campos.cabeamentoPorKwp, p.cabeamentoPorKwp),
      projetoArt: numOu(campos.projetoArt, p.projetoArt),
      maoDeObraPorKwp: numOu(campos.maoDeObraPorKwp, p.maoDeObraPorKwp),
      freteImprevistos: numOu(campos.freteImprevistos, p.freteImprevistos),
    },
    premissas: {
      bdi: numOu(campos.bdi, f.bdi),
      margemLucro: numOu(campos.margemLucro, f.margemLucro),
      impostos: numOu(campos.impostos, f.impostos),
      tma: numOu(campos.tma, f.tma),
      inflacaoTarifa: numOu(campos.inflacaoTarifa, f.inflacaoTarifa),
      degradacaoAnual: numOu(campos.degradacaoAnual, f.degradacaoAnual),
      omAnual: numOu(campos.omAnual, f.omAnual),
      horizonteAnos,
      fioBSchedule: fioBSchedule(anoConexao, horizonteAnos),
    },
  }
}

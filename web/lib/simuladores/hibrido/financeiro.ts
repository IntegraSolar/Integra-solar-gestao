// web/lib/simuladores/hibrido/financeiro.ts
// Projeção de fluxo de caixa e indicadores de viabilidade.
// Não chama o motor físico: recebe os números físicos como entrada, para que
// os dois motores permaneçam testáveis isoladamente.
import { irr } from '../finance'
import { calcularCapex } from './capex'
import { calcularEconomiaAno } from './economia'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from './premissas'
import type {
  FisicoParaFinanceiro, IndicadoresFinanceiros, LinhaProjecaoFinanceira,
  PrecosCapex, PremissasFinanceiras, ResultadoFinanceiro, TarifasInput,
} from './types'

export type ParamsFinanceiro = {
  fisico: FisicoParaFinanceiro
  tarifas: TarifasInput
  precos?: PrecosCapex
  premissas?: PremissasFinanceiras
}

/**
 * Payback por interpolação no cruzamento de zero.
 * `acumulado[n]` e `fluxo[n]` são séries alinhadas por índice, onde o índice 0
 * é o ano 0 (desembolso). Retorna `null` quando não há cruzamento no horizonte
 * ou quando o fluxo do ano seguinte não é positivo.
 */
export function calcularPaybackAnos(acumulado: number[], fluxo: number[]): number | null {
  if (acumulado.length === 0) return null
  if (acumulado[0] >= 0) return 0
  for (let n = 0; n < acumulado.length - 1; n++) {
    if (acumulado[n] < 0 && acumulado[n + 1] >= 0) {
      const proximo = fluxo[n + 1]
      if (proximo <= 0) return null
      return n + Math.abs(acumulado[n]) / proximo
    }
  }
  return null
}

export function calcularFinanceiro(params: ParamsFinanceiro): ResultadoFinanceiro {
  const precos = params.precos ?? PRECOS_CAPEX_PADRAO
  const premissas = params.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO
  const capex = calcularCapex({ fisico: params.fisico, precos, premissas })
  const investimento = capex.investimentoTotal

  const projecao: LinhaProjecaoFinanceira[] = [{
    ano: 0,
    geracaoKwh: 0,
    economiaLiquida: 0,
    custoOm: 0,
    fluxoLiquido: -investimento,
    fluxoAcumulado: -investimento,
    fluxoDescontado: -investimento,
    vplAcumulado: -investimento,
  }]

  let acumulado = -investimento
  let vplAcumulado = -investimento
  let somaOmDescontado = 0
  let somaGeracaoDescontada = 0
  let economiaAcumulada = 0

  for (let t = 1; t <= premissas.horizonteAnos; t++) {
    const econ = calcularEconomiaAno(t, { fisico: params.fisico, tarifas: params.tarifas, premissas })
    const custoOm = premissas.omAnual * investimento * Math.pow(1 + premissas.inflacaoTarifa, t - 1)
    const fluxoLiquido = econ.economiaLiquida - custoOm
    const fatorDesconto = Math.pow(1 + premissas.tma, t)
    const fluxoDescontado = fluxoLiquido / fatorDesconto

    acumulado += fluxoLiquido
    vplAcumulado += fluxoDescontado
    somaOmDescontado += custoOm / fatorDesconto
    somaGeracaoDescontada += econ.geracaoKwh / fatorDesconto
    economiaAcumulada += econ.economiaLiquida

    projecao.push({
      ano: t,
      geracaoKwh: econ.geracaoKwh,
      economiaLiquida: econ.economiaLiquida,
      custoOm,
      fluxoLiquido,
      fluxoAcumulado: acumulado,
      fluxoDescontado,
      vplAcumulado,
    })
  }

  const fluxos = projecao.map((l) => l.fluxoLiquido)
  const acumulados = projecao.map((l) => l.fluxoAcumulado)
  const descontados = projecao.map((l) => l.fluxoDescontado)
  const vplAcumulados = projecao.map((l) => l.vplAcumulado)

  const indicadores: IndicadoresFinanceiros = {
    vpl: vplAcumulado,
    tir: fluxos.length > 1 ? irr(fluxos) : 0,
    paybackSimplesAnos: calcularPaybackAnos(acumulados, fluxos),
    paybackDescontadoAnos: calcularPaybackAnos(vplAcumulados, descontados),
    lcoe: somaGeracaoDescontada > 0 ? (investimento + somaOmDescontado) / somaGeracaoDescontada : 0,
    economiaAcumulada,
    roi: investimento > 0 ? fluxos.slice(1).reduce((a, b) => a + b, 0) / investimento : 0,
    indiceVplInvestimento: investimento > 0 ? vplAcumulado / investimento : 0,
  }

  return { capex, projecao, indicadores }
}

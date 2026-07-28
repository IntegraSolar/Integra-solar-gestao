// web/lib/simuladores/viabilidade/engine.ts
import { irr, npv } from '../finance'
import type { ViabilidadeInput, ViabilidadeResultado, LinhaProjecao, MetricasCenario } from './types'

const DEGRAD_FATOR = 0.993251254 // constante da planilha (col F)

export function calcularViabilidade(input: ViabilidadeInput): ViabilidadeResultado {
  const kwp = (input.numPaineis * input.potenciaPainelWp) / 1000
  const invTotalKw = input.numInversores * input.potenciaInversorKw
  const tipoUsina: 'Microusina' | 'Miniusina' = invTotalKw <= 75 ? 'Microusina' : 'Miniusina'
  const geracaoAnualBase = kwp * 8760 * input.fatorCapacidade * 0.99
  const opexBase = input.opexPct * input.valorInvestimento
  const producao1 = geracaoAnualBase * (1 - input.degradacaoAnual)
  const reinvestAno15 = (0.10 * input.valorInvestimento) * Math.pow(1 + 0.02, 15)

  // Financiamento SAC (colunas P..U da planilha). Valores em sinal negativo,
  // como na planilha (C52 = recursos financiados = -CAPEX·%; custo é negativo).
  const financiadoSigned = -input.valorInvestimento * input.pctFinanciado // C52
  const equityInicial = -input.valorInvestimento * (1 - input.pctFinanciado) // C51 (Q2)

  const projecao: LinhaProjecao[] = []
  const fluxoProprioArr: number[] = []
  const fluxoFinanciadoArr: number[] = []

  // Ano 0 (investimento). Próprio = CAPEX cheio (C37). Financiado = capital
  // próprio (Q2) + juros da carência (S2 = U2 = R2·juros·carência/12).
  const jurosCarencia = financiadoSigned * input.jurosAnual * (input.carenciaMeses / 12)
  const fluxoFinanciado0 = equityInicial + jurosCarencia
  projecao.push({
    ano: input.anoInicial, producaoKwh: 0, tarifaBruta: 0, fioBPct: 0, tusdFioB: 0,
    tusdNaoCompensavel: 0, tarifaLiquida: 0, receitaBruta: 0,
    saldoDevedor: financiadoSigned, prestacao: jurosCarencia, amortizacao: 0, juros: jurosCarencia,
    custoDisponibilidade: 0, demandaGeracao: 0, arrendamento: 0, opex: 0, gestao: 0, imposto: 0,
    fluxoProprio: -input.valorInvestimento, fluxoProprioAcum: -input.valorInvestimento,
    fluxoFinanciado: fluxoFinanciado0, fluxoFinanciadoAcum: fluxoFinanciado0,
  })
  fluxoProprioArr.push(-input.valorInvestimento)
  fluxoFinanciadoArr.push(fluxoFinanciado0)

  let acumProprio = -input.valorInvestimento
  let acumFinan = fluxoFinanciado0

  for (let t = 1; t <= input.horizonteAnos; t++) {
    const producao = t === 1 ? producao1 : producao1 * Math.pow(DEGRAD_FATOR, t - 1)
    const tarifaLoc = input.tarifaLocacaoBase * Math.pow(1 + input.reajusteTarifaAnual, t - 1)
    const fioBpct = input.fioBSchedule[t - 1] ?? 1
    const tusdFioBAplic = input.modalidade === 'GD1' ? 0 : input.tusdFioB * fioBpct * tarifaLoc
    // GD3 (fioA/peD/tfsee) fora do escopo dos cenários GD1/GD2 — 0 aqui
    const tusdNaoComp = tusdFioBAplic
    const tarifaLiquida = (tarifaLoc - tusdNaoComp) * (1 - input.descontoLocacao)
    const receita = producao * tarifaLiquida
    // OPEX (col Y) usa expoente E = t (planilha: Y3 usa E3=1 no ano 1), ao contrário
    // da tarifa (col G), que usa t-1. Colunas têm bases de expoente diferentes.
    const opex = -opexBase * Math.pow(1 + input.reajusteTarifaAnual, t)
    const imposto = -input.impostoPct * receita
    const gestao = t === 1
      ? (-receita / 12) * 2 - input.d23 * receita - (tipoUsina === 'Microusina' ? input.sunneSetupMicro : input.sunneSetupMini)
      : -input.d23 * receita
    const demandaMini = tipoUsina === 'Microusina'
      ? 0
      : -invTotalKw * 12 * input.tarifaDemanda * Math.pow(1 + input.reajusteTarifaAnual, t - 1)
    // Custo de disponibilidade da UFV (col V) — só micro. NÃO entra no fluxo de
    // caixa (AB/AD); serve apenas ao OPEX Acumulado (VP) dos custos totais.
    const custoDisponibilidade = tipoUsina === 'Microusina'
      ? -100 * 12 * Math.pow(1 + input.reajusteTarifaAnual, t)
      : 0
    const arrendamento = 0
    const reinvest = t === 15 ? -reinvestAno15 : 0

    // Financiamento SAC (cols R..U). Amortiza em t=1..amortizacaoAnos: saldo cai
    // linearmente e o juro (saldo·taxa) acompanha; depois disso quita (0). Forma
    // fechada — reproduz a recorrência ROUND(,5) da planilha sem resíduo de ponto
    // flutuante que geraria uma 13ª parcela fantasma. Com pctFinanciado=0, tudo 0.
    const quitado = t - 1 >= input.amortizacaoAnos
    const saldoDevedor = quitado ? 0 : financiadoSigned * (1 - (t - 1) / input.amortizacaoAnos) // R(t)
    const amortizacao = quitado ? 0 : financiadoSigned / input.amortizacaoAnos // T(t)
    const juros = saldoDevedor * input.jurosAnual // U(t)
    const prestacao = amortizacao + juros // S(t)

    const fluxoProprio = receita + reinvest + demandaMini + opex + gestao + imposto + arrendamento
    const fluxoFinanciado = fluxoProprio + prestacao // AD = AB + S (S negativo)
    acumProprio += fluxoProprio
    acumFinan += fluxoFinanciado

    projecao.push({
      ano: input.anoInicial + t, producaoKwh: producao, tarifaBruta: tarifaLoc, fioBPct: fioBpct,
      tusdFioB: tusdFioBAplic, tusdNaoCompensavel: tusdNaoComp, tarifaLiquida, receitaBruta: receita,
      saldoDevedor, prestacao, amortizacao, juros,
      custoDisponibilidade, demandaGeracao: demandaMini, arrendamento, opex, gestao, imposto,
      fluxoProprio, fluxoProprioAcum: acumProprio,
      fluxoFinanciado, fluxoFinanciadoAcum: acumFinan,
    })
    fluxoProprioArr.push(fluxoProprio)
    fluxoFinanciadoArr.push(fluxoFinanciado)
  }

  const metricas = (fluxo: number[], usarProprio: boolean): MetricasCenario => ({
    tir: irr(fluxo),
    vpl: npv(input.tma, fluxo.slice(1)) + fluxo[0],
    paybackAnos: projecao.slice(1).filter((l) =>
      (usarProprio ? l.fluxoProprioAcum : l.fluxoFinanciadoAcum) < 0
    ).length,
  })

  return {
    kwp, geracaoAnualKwh: geracaoAnualBase, tipoUsina,
    projecao,
    capitalProprio: metricas(fluxoProprioArr, true),
    comFinanciamento: metricas(fluxoFinanciadoArr, false),
  }
}

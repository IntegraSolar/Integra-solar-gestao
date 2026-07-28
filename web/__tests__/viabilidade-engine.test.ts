import { describe, it, expect } from 'vitest'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

const FLUXO_ESPERADO = [-154413.82, 18018.435239867034, 30956.710616464185, 29356.702541229693,
 28698.431410173365, 30660.802146652914, 32755.913030802698, 34992.62005963194,
 37380.359504174136, 39929.185009396366, 42649.806984285067, 45553.634416037668,
 48652.81924941959, 51960.303479788265, 55489.869116039605, 38474.124044044613,
 63274.893899687246, 67562.610323837944, 72137.045471668796, 77017.043294330666,
 82222.657611738803, 87775.227259733627, 93697.455675370802, 100013.49516096816,
 106749.03607847019, 113931.40123688725]

const INPUT: ViabilidadeInput = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2',
  tusdFioB: 0.36916808562393572, tarifaDemanda: 16.983311938382542,
  valorInvestimento: 154413.82, tarifaLocacaoBase: 0.8222, reajusteTarifaAnual: 0.08,
  degradacaoAnual: 0.015, tma: 0.10, descontoLocacao: 0.20,
  opexPct: 0.081199185409699712, impostoPct: 0.045, d23: 0.125,
  sunneSetupMicro: 5000, sunneSetupMini: 10000,
  pctFinanciado: 0, jurosAnual: 0.10, carenciaMeses: 6, amortizacaoAnos: 12,
  fioBSchedule: [0.6, 0.75, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  horizonteAnos: 25, anoInicial: 2025,
}

describe('calcularViabilidade (golden RGE)', () => {
  const r = calcularViabilidade(INPUT)
  it('deriva kWp, geracao e tipo', () => {
    expect(r.kwp).toBeCloseTo(90, 6)
    expect(r.geracaoAnualKwh).toBeCloseTo(109272.24, 2)
    expect(r.tipoUsina).toBe('Microusina')
  })
  it('projeta 26 linhas (ano 0..25) e o fluxo proprio bate ano a ano', () => {
    const fluxos = [r.projecao[0].fluxoProprio, ...r.projecao.slice(1).map(l => l.fluxoProprio)]
    expect(fluxos).toHaveLength(26)
    for (let i = 0; i < FLUXO_ESPERADO.length; i++) {
      expect(fluxos[i]).toBeCloseTo(FLUXO_ESPERADO[i], 2)
    }
  })
  it('métricas capital próprio batem com o Excel', () => {
    expect(r.capitalProprio.tir).toBeCloseTo(0.21410107123012923, 6)
    expect(r.capitalProprio.vpl).toBeCloseTo(226670.96975404624, 2)
    expect(r.capitalProprio.paybackAnos).toBe(5)
  })
  it('com financiamento 0% coincide com capital próprio', () => {
    expect(r.comFinanciamento.tir).toBeCloseTo(r.capitalProprio.tir, 8)
    expect(r.comFinanciamento.vpl).toBeCloseTo(r.capitalProprio.vpl, 2)
  })
})

describe('financiamento SAC (cols P..U da planilha)', () => {
  const rf = calcularViabilidade({ ...INPUT, pctFinanciado: 0.7 })
  // C52 = -CAPEX·0,7 = -108089,674 ; amortização = C52/12 ; juros = saldo·10%.
  const amort = (-154413.82 * 0.7) / 12

  it('ano 0: saldo devedor cheio e juros da carência (6 meses)', () => {
    const l0 = rf.projecao[0]
    expect(l0.saldoDevedor).toBeCloseTo(-108089.674, 2)
    expect(l0.juros).toBeCloseTo(-5404.4837, 2)   // -108089,674·0,10·(6/12)
    expect(l0.amortizacao).toBe(0)
    // fluxo financiado ano 0 = capital próprio (-30% do CAPEX) + juros carência
    expect(l0.fluxoFinanciado).toBeCloseTo(-46324.146 - 5404.4837, 2)
  })

  it('ano 1: amortização constante + juros sobre o saldo cheio', () => {
    const l1 = rf.projecao[1]
    expect(l1.saldoDevedor).toBeCloseTo(-108089.674, 2)
    expect(l1.amortizacao).toBeCloseTo(amort, 4)
    expect(l1.juros).toBeCloseTo(-10808.9674, 2)
    expect(l1.prestacao).toBeCloseTo(amort - 10808.9674, 2)
    // AD = AB + S (prestação negativa)
    expect(l1.fluxoFinanciado).toBeCloseTo(l1.fluxoProprio + l1.prestacao, 6)
  })

  it('ano 2: saldo cai pela amortização e juros acompanham', () => {
    const l2 = rf.projecao[2]
    expect(l2.saldoDevedor).toBeCloseTo(-99082.2012, 2)
    expect(l2.juros).toBeCloseTo(-9908.2201, 2)
  })

  it('quita em 12 anos: saldo, juros e amortização zeram no ano 13', () => {
    const l13 = rf.projecao[13]
    expect(l13.saldoDevedor).toBe(0)
    expect(l13.juros).toBe(0)
    expect(l13.amortizacao).toBe(0)
  })

  it('o fluxo próprio não muda com financiamento', () => {
    for (let i = 1; i < FLUXO_ESPERADO.length; i++) {
      expect(rf.projecao[i].fluxoProprio).toBeCloseTo(FLUXO_ESPERADO[i], 2)
    }
  })
})

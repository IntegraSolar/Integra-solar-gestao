import { describe, it, expect } from 'vitest'
import {
  derivarConcessionaria,
  concessionariaParaInputs,
  type ConcessionariaBruta,
} from '@/lib/simuladores/viabilidade/concessionaria'
import { CONCESSIONARIAS_SEED } from '@/lib/simuladores/viabilidade/concessionarias-seed'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

// Linha RGE (linha 20 da aba "Premissas Básicas") — golden.
const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025',
  tusd: 517.75, te: 304.45, tusdFioB: 303.53, tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25,
  icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23,
  aplicaReajuste1430: true,
}

describe('derivarConcessionaria (golden RGE)', () => {
  const d = derivarConcessionaria(RGE)
  it('deriva tarifa total e frações (I,K,M,O,P)', () => {
    expect(d.tarifaTotalSemImp).toBeCloseTo(822.2, 6)
    expect(d.fracFioB).toBeCloseTo(0.36916808562393572, 12)
    expect(d.fracFioA).toBeCloseTo(0.07841157869131597, 12)
    expect(d.fracPeD).toBeCloseTo(0.005716370712721966, 12)
    expect(d.fracTfsee).toBeCloseTo(0.0015203113597664802, 12)
    expect(d.fracGD3Total).toBeCloseTo(0.45481634638774016, 12)
  })
  it('deriva tarifas com impostos e compensáveis (S,T,U)', () => {
    expect(d.tarifaTotalComImp).toBeCloseTo(1055.4557124518615, 8)
    expect(d.tarifaCompensavelAutoconsumo).toBeCloseTo(1055.4557124518615, 8)
    expect(d.tarifaCompensavelCompartilhada).toBeCloseTo(822.2, 6)
  })
  it('deriva demanda com impostos e redução (W,Y,Z)', () => {
    expect(d.demandaContratadaComImp).toBeCloseTo(26.873684210526317, 8)
    expect(d.demandaGeracaoComImp).toBeCloseTo(16.983311938382542, 8)
    expect(d.reducaoDcDg).toBeCloseTo(0.36803187068298415, 8)
  })
})

describe('concessionariaParaInputs (ponte p/ o motor da Peça 1)', () => {
  const i = concessionariaParaInputs(RGE)
  it('bate com o INPUT do golden da Peça 1', () => {
    expect(i.tusdFioB).toBeCloseTo(0.36916808562393572, 12)
    expect(i.tarifaLocacaoBase).toBeCloseTo(0.8222, 6)   // U/1000 (R$/MWh -> R$/kWh)
    expect(i.tarifaDemanda).toBeCloseTo(16.983311938382542, 8) // Y (aplicaReajuste=Sim)
  })
})

describe('CONCESSIONARIAS_SEED', () => {
  it('tem as 28 concessionárias da planilha, RGE incluída', () => {
    expect(CONCESSIONARIAS_SEED).toHaveLength(28)
    const rge = CONCESSIONARIAS_SEED.find((c) => c.nome === 'RGE')
    expect(rge).toBeDefined()
    expect(rge!.tusdFioB).toBe(303.53)
    expect(rge!.demandaGeracaoSemImp).toBe(13.23)
  })
  it('todos os nomes são únicos', () => {
    const nomes = CONCESSIONARIAS_SEED.map((c) => c.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })
})

// Integração ponta-a-ponta: seed RGE -> derivação -> motor da Peça 1 reproduz o golden.
describe('integração seed RGE -> concessionariaParaInputs -> motor', () => {
  it('reproduz TIR/VPL do golden da Peça 1', () => {
    const rge = CONCESSIONARIAS_SEED.find((c) => c.nome === 'RGE')!
    const derivados = concessionariaParaInputs(rge)
    const input: ViabilidadeInput = {
      numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
      fatorCapacidade: 0.14, modalidade: 'GD2',
      valorInvestimento: 154413.82, reajusteTarifaAnual: 0.08,
      degradacaoAnual: 0.015, tma: 0.10, descontoLocacao: 0.20,
      opexPct: 0.081199185409699712, impostoPct: 0.045, d23: 0.125,
      sunneSetupMicro: 5000, sunneSetupMini: 10000,
      pctFinanciado: 0, jurosAnual: 0.10, prazoMeses: 12,
      fioBSchedule: [0.6, 0.75, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      horizonteAnos: 25, anoInicial: 2025,
      ...derivados, // tusdFioB, tarifaLocacaoBase, tarifaDemanda vêm da concessionária
    }
    const r = calcularViabilidade(input)
    expect(r.capitalProprio.tir).toBeCloseTo(0.21410107123012923, 6)
    expect(r.capitalProprio.vpl).toBeCloseTo(226670.96975404624, 2)
  })
})

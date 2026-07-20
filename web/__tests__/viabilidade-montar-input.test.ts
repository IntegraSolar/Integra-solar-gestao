import { describe, it, expect } from 'vitest'
import { montarViabilidadeInput, PREMISSAS_DEFAULT, type CamposSimulador } from '@/lib/simuladores/viabilidade/montar-input'
import { CONCESSIONARIAS_SEED } from '@/lib/simuladores/viabilidade/concessionarias-seed'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import { fioBSchedule } from '@/lib/simuladores/fio-b'

const RGE = CONCESSIONARIAS_SEED.find((c) => c.nome === 'RGE')!
const CAMPOS: CamposSimulador = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2',
  valorInvestimento: 154413.82, descontoLocacao: 0.20, pctFinanciado: 0,
}

describe('PREMISSAS_DEFAULT', () => {
  it('fioBSchedule tem 25 elementos derivados do ano corrente (Lei 14.300)', () => {
    // Derivado, não fixo: em 2026 dá [0.6, 0.75, 0.9, 1…]; em 2027 começa em 0.75.
    expect(PREMISSAS_DEFAULT.fioBSchedule).toHaveLength(25)
    expect(PREMISSAS_DEFAULT.fioBSchedule).toEqual(fioBSchedule(new Date().getFullYear(), 25))
  })
})

describe('montarViabilidadeInput (golden RGE)', () => {
  const input = montarViabilidadeInput(CAMPOS, RGE)
  it('injeta os 3 campos derivados da concessionária', () => {
    expect(input.tusdFioB).toBeCloseTo(0.36916808562393572, 12)
    expect(input.tarifaLocacaoBase).toBeCloseTo(0.8222, 6)
    expect(input.tarifaDemanda).toBeCloseTo(16.983311938382542, 8)
  })
  it('reproduz TIR/VPL/Payback do Excel via motor', () => {
    const r = calcularViabilidade(input)
    expect(r.capitalProprio.tir).toBeCloseTo(0.21410107123012923, 6)
    expect(r.capitalProprio.vpl).toBeCloseTo(226670.96975404624, 2)
    expect(r.capitalProprio.paybackAnos).toBe(5)
  })
  it('permite sobrescrever uma premissa avançada', () => {
    const alt = montarViabilidadeInput({ ...CAMPOS, premissas: { tma: 0.12 } }, RGE)
    expect(alt.tma).toBe(0.12)
    expect(alt.reajusteTarifaAnual).toBe(0.08)
  })
  it('não compartilha a ref do fioBSchedule default (cópia defensiva)', () => {
    montarViabilidadeInput(CAMPOS, RGE).fioBSchedule[0] = 99
    expect(PREMISSAS_DEFAULT.fioBSchedule[0]).toBe(0.6)
  })
})

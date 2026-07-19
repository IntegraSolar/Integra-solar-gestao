import { describe, it, expect } from 'vitest'
import { calcularStrings } from '@/lib/simuladores/hibrido/strings'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { PROJETO, PAINEL, INVERSOR } from './fixtures/hibrido-fixture'

const base = { projeto: PROJETO, painel: PAINEL, inversor: INVERSOR, numModulos: 16, premissas: PREMISSAS_PADRAO }

describe('calcularStrings (golden da planilha)', () => {
  const r = calcularStrings({ ...base, modulosPorString: 8 })

  it('tensões extremas por módulo', () => {
    expect(r.vocTminV).toBeCloseTo(49.448100000000004, 9)
    expect(r.vmpTmaxV).toBeCloseTo(36.233137500000005, 9)
  })
  it('limites de módulos por string', () => {
    expect(r.maxModulosPorString).toBe(10)
    expect(r.minModulosPorString).toBe(4)
  })
  it('arranjo definido: 8 módulos × 2 strings', () => {
    expect(r.modulosPorString).toBe(8)
    expect(r.numStrings).toBe(2)
    expect(r.modulosConfigurados).toBe(16)
  })
  it('tensões e correntes da string', () => {
    expect(r.tensaoStringVocTminV).toBeCloseTo(395.58480000000003, 9)
    expect(r.tensaoStringVmpTmaxV).toBeCloseTo(289.86510000000004, 9)
    expect(r.correnteStringIscA).toBeCloseTo(16.08, 9)
    expect(r.correnteProjetoA).toBeCloseTo(20.099999999999998, 9)
    expect(r.correntePorMpptA).toBeCloseTo(16.08, 9)
  })
})

describe('defaults e fallbacks', () => {
  it('sem override, módulos por string = máximo permitido pela tensão', () => {
    const r = calcularStrings(base)
    expect(r.modulosPorString).toBe(10)
    expect(r.numStrings).toBe(2) // ceil(16/10)
  })
  it('painel sem coefVoc usa a premissa padrão (-0.003)', () => {
    const r = calcularStrings({ ...base, painel: { ...PAINEL, coefVoc: null }, modulosPorString: 8 })
    expect(r.vocTminV).toBeCloseTo(49.08 * (1 + -0.003 * (22 - 25)), 9)
  })
  it('sem painel ou sem inversor zera sem lançar', () => {
    expect(calcularStrings({ ...base, painel: null }).maxModulosPorString).toBe(0)
    expect(calcularStrings({ ...base, inversor: null }).maxModulosPorString).toBe(0)
  })
  it('numStrings pode ser sobrescrito', () => {
    const r = calcularStrings({ ...base, modulosPorString: 8, numStrings: 3 })
    expect(r.numStrings).toBe(3)
    expect(r.modulosConfigurados).toBe(24)
  })
})

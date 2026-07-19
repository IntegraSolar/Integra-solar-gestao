import { describe, it, expect } from 'vitest'
import { calcularInversor } from '@/lib/simuladores/hibrido/inversor'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { INVERSOR } from './fixtures/hibrido-fixture'

const base = {
  inversor: INVERSOR,
  potenciaSimultaneaW: 4056.4999999999995,
  potenciaPartidaW: 5795,
  potenciaInstaladaKwp: 9.92,
  premissas: PREMISSAS_PADRAO,
}

describe('calcularInversor (golden da planilha)', () => {
  const r = calcularInversor(base)

  it('requisitos de potência', () => {
    expect(r.potenciaCaMinimaW).toBeCloseTo(5070.624999999999, 9)
    expect(r.folgaPotenciaW).toBeCloseTo(2929.375000000001, 9)
    expect(r.utilizacaoContinua).toBeCloseTo(0.5070625, 9)
  })
  it('surge, uso da entrada FV e paralelismo', () => {
    expect(r.relacaoSurgePartida).toBeCloseTo(2.76100086281277, 9)
    expect(r.usoEntradaFv).toBeCloseTo(0.9538461538461539, 9)
    expect(r.numInversoresParalelo).toBe(1)
    expect(r.potenciaCaTotalW).toBeCloseTo(8000, 9)
  })
})

describe('robustez', () => {
  it('carga maior que um inversor exige dois em paralelo', () => {
    const r = calcularInversor({ ...base, potenciaSimultaneaW: 9000 })
    expect(r.numInversoresParalelo).toBe(2)
    expect(r.potenciaCaTotalW).toBeCloseTo(16000, 9)
  })
  it('inversor sem potSurgeW zera a relação de surge', () => {
    const r = calcularInversor({ ...base, inversor: { ...INVERSOR, potSurgeW: null } })
    expect(r.relacaoSurgePartida).toBe(0)
  })
  it('potência de partida zero não gera divisão por zero', () => {
    const r = calcularInversor({ ...base, potenciaPartidaW: 0 })
    expect(r.relacaoSurgePartida).toBe(0)
  })
  it('sem inversor zera tudo sem lançar', () => {
    const r = calcularInversor({ ...base, inversor: null })
    expect(r.potenciaCaTotalW).toBe(0)
    expect(r.numInversoresParalelo).toBe(0)
    expect(r.usoEntradaFv).toBe(0)
  })
})

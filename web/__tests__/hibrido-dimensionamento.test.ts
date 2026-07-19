import { describe, it, expect } from 'vitest'
import { calcularPrBase, calcularDimensionamento } from '@/lib/simuladores/hibrido/dimensionamento'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { PROJETO, PAINEL } from './fixtures/hibrido-fixture'

const base = { projeto: PROJETO, painel: PAINEL, consumoDiarioKwh: 5.85, potCaNomW: 8000, premissas: PREMISSAS_PADRAO }

describe('calcularPrBase', () => {
  it('produtório dos fatores de perda × eficiência do inversor', () => {
    expect(calcularPrBase(PREMISSAS_PADRAO)).toBeCloseTo(0.8637167691269617, 12)
  })
})

describe('calcularDimensionamento (golden da planilha)', () => {
  const r = calcularDimensionamento({ ...base, numModulos: 16 })

  it('performance ratio e temperatura', () => {
    expect(r.prBase).toBeCloseTo(0.8637167691269617, 12)
    expect(r.prEfetivo).toBeCloseTo(0.8210491607320898, 12)
    expect(r.tempCelulaC).toBeCloseTo(58.25, 9)
    expect(r.fatorTemperatura).toBeCloseTo(0.903575, 9)
    expect(r.prTotal).toBeCloseTo(0.7418794954084981, 12)
  })
  it('HSP média, mês crítico e critério', () => {
    expect(r.hspMediaAnual).toBeCloseTo(5.264166666666667, 9)
    expect(r.hspMesCritico).toBeCloseTo(4.7, 9)
    expect(r.mesCriticoIndice).toBe(2) // março
    expect(r.hspDimensionamento).toBeCloseTo(4.7, 9)
  })
  it('energia por módulo e nº recomendado', () => {
    expect(r.energiaPorModuloKwhDia).toBeCloseTo(2.1618368496203635, 12)
    expect(r.numModulosRecomendado).toBe(3)
  })
  it('potência, área e produção com 16 módulos', () => {
    expect(r.numModulos).toBe(16)
    expect(r.potenciaInstaladaKwp).toBeCloseTo(9.92, 9)
    expect(r.areaTotalM2).toBeCloseTo(43.2, 9)
    expect(r.producaoDiariaKwh).toBeCloseTo(34.589389593925816, 9)
    expect(r.producaoAnualKwh).toBeCloseTo(14149.415366185884, 6)
    expect(r.oversizingDcAc).toBeCloseTo(1.24, 9)
  })
  it('produção mensal bate mês a mês', () => {
    expect(r.producaoMensalKwh).toHaveLength(12)
    expect(r.producaoMensalKwh[0]).toBeCloseTo(1083.6782165331012, 6)   // Jan
    expect(r.producaoMensalKwh[1]).toBeCloseTo(970.5635531163693, 6)    // Fev
    expect(r.producaoMensalKwh[7]).toBeCloseTo(1348.3238441496062, 6)   // Ago
    expect(r.producaoMensalKwh[11]).toBeCloseTo(1090.522500005942, 6)   // Dez
  })
})

describe('critério média anual', () => {
  it('usa a HSP média em vez da do mês crítico', () => {
    const r = calcularDimensionamento({ ...base, projeto: { ...PROJETO, criterioGeracao: 'media_anual' }, numModulos: 16 })
    expect(r.hspDimensionamento).toBeCloseTo(5.264166666666667, 9)
  })
})

describe('fallbacks e robustez', () => {
  it('painel sem coefPmp usa a premissa padrão (-0.0035)', () => {
    const r = calcularDimensionamento({ ...base, painel: { ...PAINEL, coefPmp: null }, numModulos: 16 })
    expect(r.fatorTemperatura).toBeCloseTo(1 + (-0.0035) * (58.25 - 25), 9)
  })
  it('painel sem noct usa a premissa padrão (45)', () => {
    const r = calcularDimensionamento({ ...base, painel: { ...PAINEL, noct: null }, numModulos: 16 })
    expect(r.tempCelulaC).toBeCloseTo(58.25, 9)
  })
  it('sem painel zera tudo sem lançar', () => {
    const r = calcularDimensionamento({ ...base, painel: null })
    expect(r.potenciaInstaladaKwp).toBe(0)
    expect(r.producaoAnualKwh).toBe(0)
    expect(r.numModulosRecomendado).toBe(0)
    expect(r.oversizingDcAc).toBe(0)
  })
  it('consumo zero não gera divisão por zero no nº recomendado', () => {
    const r = calcularDimensionamento({ ...base, consumoDiarioKwh: 0, numModulos: 16 })
    expect(r.numModulosRecomendado).toBe(0)
  })
  it('HSP toda zero zera a produção sem lançar', () => {
    const r = calcularDimensionamento({ ...base, projeto: { ...PROJETO, hspMensal: new Array(12).fill(0) }, numModulos: 16 })
    expect(r.producaoDiariaKwh).toBe(0)
    expect(r.producaoAnualKwh).toBe(0)
  })
})

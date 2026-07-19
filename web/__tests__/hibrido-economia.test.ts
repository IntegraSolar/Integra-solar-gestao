import { describe, it, expect } from 'vitest'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { FISICO, TARIFAS } from './fixtures/hibrido-fixture'

const comRampa = { fisico: FISICO, tarifas: TARIFAS, premissas: PREMISSAS_FINANCEIRAS_PADRAO }
const semRampa = {
  ...comRampa,
  premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, fioBSchedule: new Array(25).fill(1) },
}

describe('ano 1 SEM rampa — golden da planilha', () => {
  const r = calcularEconomiaAno(1, semRampa)

  it('separa autoconsumo de excedente', () => {
    expect(r.autoconsumoKwh).toBeCloseTo(2135.25, 6)
    expect(r.excedenteKwh).toBeCloseTo(12014.165366185884, 6)
  })
  it('tarifa e TUSD do ano 1 são os nominais', () => {
    expect(r.tarifaAno).toBeCloseTo(1.22, 9)
    expect(r.tusdAno).toBeCloseTo(0.36, 9)
  })
  it('componentes da economia', () => {
    expect(r.economiaAutoconsumo).toBeCloseTo(2605.005, 6)
    expect(r.creditoExcedente).toBeCloseTo(10332.18221491986, 6)
    expect(r.custoDisponibilidade).toBeCloseTo(1464, 6)
    expect(r.economiaLiquida).toBeCloseTo(11473.18721491986, 6)
  })
})

describe('COM a rampa da Lei 14.300 — valores calculados à mão no spec', () => {
  it('ano 1: Fio B a 60% → TUSD efetivo 0,216', () => {
    const r = calcularEconomiaAno(1, comRampa)
    expect(r.tusdAno).toBeCloseTo(0.216, 9)
    expect(r.creditoExcedente).toBeCloseTo(12062.222027650628, 6)
    expect(r.economiaLiquida).toBeCloseTo(13203.227027650628, 6)
  })
  it('ano 2: Fio B a 75%, tarifa inflacionada em 8%', () => {
    const r = calcularEconomiaAno(2, comRampa)
    expect(r.geracaoKwh).toBeCloseTo(14078.668289354954, 6)
    expect(r.excedenteKwh).toBeCloseTo(11943.418289354954, 6)
    expect(r.tarifaAno).toBeCloseTo(1.3176, 9)
    expect(r.tusdAno).toBeCloseTo(0.2916, 9)
    expect(r.economiaAutoconsumo).toBeCloseTo(2813.4054, 6)
    expect(r.creditoExcedente).toBeCloseTo(12253.947164878183, 6)
    expect(r.custoDisponibilidade).toBeCloseTo(1581.12, 6)
    expect(r.economiaLiquida).toBeCloseTo(13486.232564878183, 6)
  })
  it('ano 4 em diante o Fio B é integral', () => {
    const r = calcularEconomiaAno(4, comRampa)
    expect(r.tusdAno).toBeCloseTo(0.36 * Math.pow(1.08, 3), 9)
  })
  it('a rampa deixa a economia do ano 1 maior que sem rampa', () => {
    expect(calcularEconomiaAno(1, comRampa).economiaLiquida)
      .toBeGreaterThan(calcularEconomiaAno(1, semRampa).economiaLiquida)
  })
})

describe('bordas', () => {
  it('schedule mais curto que o ano usa fator 1', () => {
    const p = { ...comRampa, premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, fioBSchedule: [0.6] } }
    const r = calcularEconomiaAno(5, p)
    expect(r.tusdAno).toBeCloseTo(0.36 * Math.pow(1.08, 4), 9)
  })
  it('geração menor que consumo: tudo é autoconsumo, sem excedente', () => {
    const p = { ...semRampa, fisico: { ...FISICO, producaoAnualKwh: 1000, consumoAnualKwh: 5000 } }
    const r = calcularEconomiaAno(1, p)
    expect(r.autoconsumoKwh).toBeCloseTo(1000, 6)
    expect(r.excedenteKwh).toBe(0)
    expect(r.creditoExcedente).toBe(0)
  })
  it('TUSD acima da tarifa zera o crédito de excedente (não fica negativo)', () => {
    const p = { ...semRampa, tarifas: { ...TARIFAS, tusdFioBKwh: 5 } }
    const r = calcularEconomiaAno(1, p)
    expect(r.creditoExcedente).toBe(0)
  })
  it('economia líquida nunca é negativa', () => {
    const p = { ...semRampa, tarifas: { ...TARIFAS, disponibilidadeKwhMes: 100000 } }
    expect(calcularEconomiaAno(1, p).economiaLiquida).toBe(0)
  })
  it('geração zero zera tudo sem NaN', () => {
    const p = { ...semRampa, fisico: { ...FISICO, producaoAnualKwh: 0 } }
    const r = calcularEconomiaAno(1, p)
    expect(r.geracaoKwh).toBe(0)
    expect(r.economiaLiquida).toBe(0)
  })
})

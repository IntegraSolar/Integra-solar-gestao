import { describe, it, expect } from 'vitest'
import { calcularBaterias } from '@/lib/simuladores/hibrido/baterias'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { BATERIA, INVERSOR } from './fixtures/hibrido-fixture'

const base = {
  bateria: BATERIA,
  inversor: INVERSOR,
  consumoDiarioKwh: 5.85,
  consumoDiarioCriticoKwh: 2.88,
  potenciaSimultaneaW: 4056.4999999999995,
  premissas: PREMISSAS_PADRAO,
}

describe('calcularBaterias (golden da planilha)', () => {
  const r = calcularBaterias(base)

  it('parâmetros da bateria (percentuais convertidos em fração)', () => {
    expect(r.tensaoBancoV).toBe(48)
    expect(r.dodNominal).toBeCloseTo(0.9, 9)
    expect(r.socMin).toBeCloseTo(0.1, 9)
    expect(r.eficienciaRoundTrip).toBeCloseTo(0.94, 9)
    expect(r.energiaBateriaKwh).toBeCloseTo(7.2, 9)
  })
  it('janela útil e eficiência do sistema', () => {
    expect(r.dodUtil).toBeCloseTo(0.9, 9)
    expect(r.etaSistema).toBeCloseTo(0.9211999999999999, 12)
  })
  it('dimensionamento do banco', () => {
    expect(r.energiaDiariaConsideradaKwh).toBeCloseTo(5.85, 9)
    expect(r.energiaUtilNecessariaKwh).toBeCloseTo(11.7, 9)
    expect(r.energiaNominalBancoKwh).toBeCloseTo(14.11202778983934, 9)
    expect(r.capacidadeNominalAh).toBeCloseTo(294.0005789549862, 6)
    expect(r.bateriasSerie).toBe(1)
    expect(r.stringsParalelo).toBe(2)
    expect(r.numBaterias).toBe(2)
    expect(r.energiaInstaladaKwh).toBeCloseTo(14.4, 9)
    expect(r.capacidadeBancoAh).toBeCloseTo(300, 9)
  })
  it('resultados operacionais', () => {
    expect(r.energiaUtilRealKwh).toBeCloseTo(11.938752, 9)
    expect(r.autonomiaRealDias).toBeCloseTo(2.0408123076923075, 9)
    expect(r.correnteMaxDescargaA).toBeCloseTo(200, 9)
    expect(r.correnteContinuaA).toBeCloseTo(150, 9)
    expect(r.potenciaMaxDescargaKw).toBeCloseTo(9.6, 9)
    expect(r.cRateDescarga).toBeCloseTo(0.2817013888888889, 12)
    expect(r.tempoRecargaH).toBeCloseTo(1.6581599999999999, 9)
    expect(r.vidaUtilAnos).toBeCloseTo(16.438356164383563, 9)
  })
})

describe('opções e fallbacks', () => {
  it('base "criticas" usa o consumo das cargas críticas', () => {
    const r = calcularBaterias({ ...base, baseEnergia: 'criticas' })
    expect(r.energiaDiariaConsideradaKwh).toBeCloseTo(2.88, 9)
    expect(r.energiaUtilNecessariaKwh).toBeCloseTo(5.76, 9)
  })
  it('diasAutonomia pode ser sobrescrito', () => {
    const r = calcularBaterias({ ...base, diasAutonomia: 3 })
    expect(r.energiaUtilNecessariaKwh).toBeCloseTo(17.55, 9)
  })
  it('tensão do banco pode ser sobrescrita', () => {
    const r = calcularBaterias({ ...base, tensaoBancoV: 96 })
    expect(r.tensaoBancoV).toBe(96)
    expect(r.bateriasSerie).toBe(2)
  })
  it('bateria sem energiaKwh calcula V×Ah/1000', () => {
    const r = calcularBaterias({ ...base, bateria: { ...BATERIA, energiaKwh: null } })
    expect(r.energiaBateriaKwh).toBeCloseTo(7.2, 9)
  })
  it('bateria sem dod/eficiencia usa o fallback da tecnologia (Lítio NMC)', () => {
    const r = calcularBaterias({ ...base, bateria: { ...BATERIA, dod: null, eficiencia: null } })
    expect(r.dodNominal).toBeCloseTo(0.85, 9)
    expect(r.eficienciaRoundTrip).toBeCloseTo(0.94, 9)
  })
  it('bateria sem socMin usa a premissa padrão (0.2)', () => {
    const r = calcularBaterias({ ...base, bateria: { ...BATERIA, socMin: null } })
    expect(r.socMin).toBeCloseTo(0.2, 9)
    expect(r.dodUtil).toBeCloseTo(0.8, 9) // min(0.9, 1-0.2)
  })
  it('sem bateria zera tudo sem lançar', () => {
    const r = calcularBaterias({ ...base, bateria: null })
    expect(r.numBaterias).toBe(0)
    expect(r.energiaInstaladaKwh).toBe(0)
    expect(r.autonomiaRealDias).toBe(0)
  })
  it('consumo zero não gera divisão por zero na autonomia', () => {
    const r = calcularBaterias({ ...base, consumoDiarioKwh: 0 })
    expect(r.autonomiaRealDias).toBe(0)
  })
})

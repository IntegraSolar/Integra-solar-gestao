import { describe, it, expect } from 'vitest'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { PROJETO, PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'
import type { HibridoInput } from '@/lib/simuladores/hibrido/types'

const INPUT: HibridoInput = {
  projeto: PROJETO,
  cargas: CARGAS,
  painel: PAINEL,
  inversor: INVERSOR,
  bateria: BATERIA,
  numModulos: 16,
  modulosPorString: 8,
  tipoSistema: 'Híbrido',
}

describe('calcularHibrido (integração, golden da planilha)', () => {
  const r = calcularHibrido(INPUT)

  it('encadeia cargas → dimensionamento', () => {
    expect(r.cargas.consumoDiarioKwh).toBeCloseTo(5.85, 9)
    expect(r.dimensionamento.prTotal).toBeCloseTo(0.7418794954084981, 12)
    expect(r.dimensionamento.producaoAnualKwh).toBeCloseTo(14149.415366185884, 6)
    expect(r.dimensionamento.oversizingDcAc).toBeCloseTo(1.24, 9)
  })
  it('encadeia dimensionamento → strings', () => {
    expect(r.strings.modulosConfigurados).toBe(16)
    expect(r.strings.tensaoStringVocTminV).toBeCloseTo(395.58480000000003, 9)
  })
  it('encadeia cargas → baterias', () => {
    expect(r.baterias.numBaterias).toBe(2)
    expect(r.baterias.autonomiaRealDias).toBeCloseTo(2.0408123076923075, 9)
  })
  it('encadeia cargas → inversor', () => {
    expect(r.inversor.potenciaCaMinimaW).toBeCloseTo(5070.624999999999, 9)
    expect(r.inversor.numInversoresParalelo).toBe(1)
  })
  it('não gera nenhum alerta de erro no cenário nominal', () => {
    expect(r.alertas.filter((a) => a.severidade === 'erro')).toHaveLength(0)
  })
})

describe('overrides de premissas', () => {
  it('simultaneidade menor reduz a potência simultânea e o inversor mínimo', () => {
    const r = calcularHibrido(INPUT, { ...PREMISSAS_PADRAO, simultaneidade: 0.5 })
    expect(r.cargas.potenciaSimultaneaW).toBeCloseTo(2897.5, 9)
    expect(r.inversor.potenciaCaMinimaW).toBeCloseTo(3621.875, 9)
  })
  it('mais dias de autonomia aumentam o banco', () => {
    const r = calcularHibrido({ ...INPUT, diasAutonomia: 4 })
    expect(r.baterias.energiaUtilNecessariaKwh).toBeCloseTo(23.4, 9)
    expect(r.baterias.numBaterias).toBe(4)
  })
})

describe('robustez do orquestrador', () => {
  it('input vazio não lança e devolve DADOS_INSUFICIENTES', () => {
    const r = calcularHibrido({
      projeto: PROJETO, cargas: [], painel: null, inversor: null, bateria: null,
    })
    expect(r.dimensionamento.potenciaInstaladaKwp).toBe(0)
    expect(r.baterias.numBaterias).toBe(0)
    expect(r.inversor.potenciaCaTotalW).toBe(0)
    expect(r.alertas.some((a) => a.codigo === 'DADOS_INSUFICIENTES')).toBe(true)
  })
  it('sem numModulos usa o recomendado', () => {
    const r = calcularHibrido({ ...INPUT, numModulos: undefined, modulosPorString: undefined })
    expect(r.dimensionamento.numModulos).toBe(3)
  })
})

import { describe, it, expect } from 'vitest'
import { montarViabilidadeInput, camposDoInput, PREMISSAS_DEFAULT, type CamposSimulador } from '@/lib/simuladores/viabilidade/montar-input'
import type { ConcessionariaBruta } from '@/lib/simuladores/viabilidade/concessionaria'

const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025', tusd: 517.75, te: 304.45, tusdFioB: 303.53,
  tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25, icms: 0.18, pisCofins: 0.05,
  demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23, aplicaReajuste1430: true,
}

describe('camposDoInput', () => {
  it('reconstrói os campos por-negócio salvos no input', () => {
    const original: CamposSimulador = {
      numPaineis: 200, potenciaPainelWp: 550, numInversores: 2, potenciaInversorKw: 100,
      fatorCapacidade: 0.16, modalidade: 'GD2', valorInvestimento: 300000,
      descontoLocacao: 0.25, pctFinanciado: 0.5, premissas: PREMISSAS_DEFAULT,
    }
    const input = montarViabilidadeInput(original, RGE)
    const volta = camposDoInput(input)
    expect(volta.numPaineis).toBe(200)
    expect(volta.potenciaPainelWp).toBe(550)
    expect(volta.numInversores).toBe(2)
    expect(volta.potenciaInversorKw).toBe(100)
    expect(volta.fatorCapacidade).toBe(0.16)
    expect(volta.modalidade).toBe('GD2')
    expect(volta.valorInvestimento).toBe(300000)
    expect(volta.descontoLocacao).toBe(0.25)
    expect(volta.pctFinanciado).toBe(0.5)
  })

  it('reconstrói as premissas do input', () => {
    const original: CamposSimulador = {
      numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
      fatorCapacidade: 0.14, modalidade: 'GD1', valorInvestimento: 154413.82,
      descontoLocacao: 0.2, pctFinanciado: 0,
      premissas: { ...PREMISSAS_DEFAULT, tma: 0.12, impostoPct: 0.06 },
    }
    const volta = camposDoInput(montarViabilidadeInput(original, RGE))
    expect(volta.modalidade).toBe('GD1')
    expect(volta.premissas?.tma).toBe(0.12)
    expect(volta.premissas?.impostoPct).toBe(0.06)
    expect(volta.premissas?.horizonteAnos).toBe(PREMISSAS_DEFAULT.horizonteAnos)
  })

  it('o input reconstruído produz o mesmo input (round-trip via concessionária)', () => {
    const original: CamposSimulador = {
      numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
      fatorCapacidade: 0.14, modalidade: 'GD2', valorInvestimento: 154413.82,
      descontoLocacao: 0.2, pctFinanciado: 0, premissas: PREMISSAS_DEFAULT,
    }
    const input1 = montarViabilidadeInput(original, RGE)
    const input2 = montarViabilidadeInput(camposDoInput(input1), RGE)
    expect(input2).toEqual(input1)
  })
})

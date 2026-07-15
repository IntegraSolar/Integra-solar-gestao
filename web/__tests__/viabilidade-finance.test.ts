import { describe, it, expect } from 'vitest'
import { npv, irr } from '@/lib/simuladores/viabilidade/finance'

const FLUXO = [-154413.82, 18018.435239867034, 30956.710616464185, 29356.702541229693,
 28698.431410173365, 30660.802146652914, 32755.913030802698, 34992.62005963194,
 37380.359504174136, 39929.185009396366, 42649.806984285067, 45553.634416037668,
 48652.81924941959, 51960.303479788265, 55489.869116039605, 38474.124044044613,
 63274.893899687246, 67562.610323837944, 72137.045471668796, 77017.043294330666,
 82222.657611738803, 87775.227259733627, 93697.455675370802, 100013.49516096816,
 106749.03607847019, 113931.40123688725]

describe('npv', () => {
  it('desconta um fluxo simples corretamente', () => {
    // 100 daqui a 1 ano a 10% = 90.909...
    expect(npv(0.1, [100])).toBeCloseTo(90.9090909, 6)
  })
})

describe('irr', () => {
  it('reproduz a TIR do Excel para o fluxo da planilha', () => {
    expect(irr(FLUXO)).toBeCloseTo(0.21410107123012923, 8)
  })
  it('VPL do fluxo (tma 10%) bate com o Excel', () => {
    // NPV(tma, fluxo[1..]) + fluxo[0]
    expect(npv(0.1, FLUXO.slice(1)) + FLUXO[0]).toBeCloseTo(226670.96975404624, 4)
  })
})

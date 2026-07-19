import { describe, it, expect } from 'vitest'
import { calcularCargas, correnteDaCarga } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { CARGAS } from './fixtures/hibrido-fixture'
import type { Carga } from '@/lib/simuladores/hibrido/types'

describe('calcularCargas (golden da planilha)', () => {
  const r = calcularCargas(CARGAS, PREMISSAS_PADRAO)

  it('consumo diário/mensal/anual', () => {
    expect(r.consumoDiarioWh).toBeCloseTo(5850, 6)
    expect(r.consumoDiarioKwh).toBeCloseTo(5.85, 6)
    expect(r.consumoMensalKwh).toBeCloseTo(175.5, 6)
    expect(r.consumoAnualKwh).toBeCloseTo(2135.25, 6)
  })
  it('consumo das cargas críticas (só as lâmpadas)', () => {
    expect(r.consumoDiarioCriticoWh).toBeCloseTo(2880, 6)
    expect(r.consumoDiarioCriticoKwh).toBeCloseTo(2.88, 6)
  })
  it('potências conectada, simultânea e de partida', () => {
    expect(r.potenciaConectadaW).toBeCloseTo(5795, 6)
    expect(r.potenciaSimultaneaW).toBeCloseTo(4056.4999999999995, 6)
    expect(r.potenciaPartidaW).toBeCloseTo(5795, 6)
  })
})

describe('curva 24h (corrige defeito da planilha)', () => {
  // A planilha tinha 240 W fixos nas 24 horas (sem fórmula). Aqui a curva é
  // calculada de verdade: às 19h coincidem lâmpadas (240) + TV (55) + chuveiro (5500).
  const r = calcularCargas(CARGAS, PREMISSAS_PADRAO)

  it('tem 24 posições', () => {
    expect(r.curva24h).toHaveLength(24)
  })
  it('pico real é 5795 W às 19h, não os 240 W da planilha', () => {
    expect(r.curva24h[19]).toBeCloseTo(5795, 6)
    expect(r.picoDemandaW).toBeCloseTo(5795, 6)
  })
  it('às 18h: lâmpadas + TV, sem chuveiro', () => {
    expect(r.curva24h[18]).toBeCloseTo(295, 6)
  })
  it('lâmpadas atravessam a meia-noite: ativas às 23h e às 0h', () => {
    expect(r.curva24h[23]).toBeCloseTo(240, 6)
    expect(r.curva24h[0]).toBeCloseTo(240, 6)
  })
  it('às 6h as lâmpadas já desligaram (intervalo é fechado no fim)', () => {
    expect(r.curva24h[6]).toBeCloseTo(0, 6)
  })
  it('às 12h não há carga ativa', () => {
    expect(r.curva24h[12]).toBeCloseTo(0, 6)
  })
})

describe('robustez', () => {
  it('lista vazia zera tudo e devolve curva de 24 zeros', () => {
    const r = calcularCargas([], PREMISSAS_PADRAO)
    expect(r.consumoDiarioWh).toBe(0)
    expect(r.potenciaConectadaW).toBe(0)
    expect(r.picoDemandaW).toBe(0)
    expect(r.curva24h).toEqual(new Array(24).fill(0))
  })
  it('carga com horaFim igual a horaInicio é inativa (intervalo nulo)', () => {
    const c: Carga = { ...CARGAS[0], horaInicio: 10, horaFim: 10 }
    const r = calcularCargas([c], PREMISSAS_PADRAO)
    expect(r.picoDemandaW).toBe(0)
  })
})

describe('correnteDaCarga', () => {
  it('I = qtd × P / (V × FP)', () => {
    expect(correnteDaCarga(CARGAS[0])).toBeCloseTo(0.2777777777777778, 9)
    expect(correnteDaCarga(CARGAS[1])).toBeCloseTo(25, 9)
    expect(correnteDaCarga(CARGAS[2])).toBeCloseTo(1.1857707509881423, 9)
  })
  it('guarda divisão por zero', () => {
    expect(correnteDaCarga({ ...CARGAS[0], tensaoV: 0 })).toBe(0)
    expect(correnteDaCarga({ ...CARGAS[0], fatorPotencia: 0 })).toBe(0)
  })
})

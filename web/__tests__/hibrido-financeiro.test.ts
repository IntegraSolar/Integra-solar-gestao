import { describe, it, expect } from 'vitest'
import { calcularFinanceiro, calcularPaybackAnos } from '@/lib/simuladores/hibrido/financeiro'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { FISICO, TARIFAS } from './fixtures/hibrido-fixture'
import type { PrecosCapex, PremissasFinanceiras } from '@/lib/simuladores/hibrido/types'

describe('calcularPaybackAnos (interpolação no cruzamento de zero)', () => {
  it('interpola entre o último ano negativo e o seguinte', () => {
    // acumulado: [-1000, -600, -200, 200] com fluxos [−1000, 400, 400, 400]
    expect(calcularPaybackAnos([-1000, -600, -200, 200], [-1000, 400, 400, 400])).toBeCloseTo(2.5, 9)
  })
  it('reproduz o número da planilha (ano 6 → 7)', () => {
    const acum = [-1, -13232.082599384767, 3011.880165328652]
    const fluxo = [-1, 0, 16243.962764713418]
    // cruzamento entre os índices 1 e 2 → 1 + 13232.08/16243.96
    expect(calcularPaybackAnos(acum, fluxo)).toBeCloseTo(1 + 13232.082599384767 / 16243.962764713418, 9)
  })
  it('se paga dentro do primeiro ano (n = 0)', () => {
    expect(calcularPaybackAnos([-100, 100], [-100, 200])).toBeCloseTo(0.5, 9)
  })
  it('nunca cruza zero → null', () => {
    expect(calcularPaybackAnos([-1000, -900, -800], [-1000, 100, 100])).toBeNull()
  })
  it('fluxo seguinte não positivo → null', () => {
    expect(calcularPaybackAnos([-1000, 0], [-1000, 0])).toBeNull()
  })
  it('investimento zero → 0', () => {
    expect(calcularPaybackAnos([0, 100], [0, 100])).toBe(0)
  })
})

describe('LCOE em caso trivial calculável à mão', () => {
  it('investimento 1000, sem O&M, 1000 kWh num ano, TMA 0 → 1,00 R$/kWh', () => {
    const precos: PrecosCapex = {
      moduloUnitario: 0, inversorUnitario: 0, bateriaUnitaria: 0, estruturaPorModulo: 0,
      cabeamentoPorKwp: 0, projetoArt: 1000, maoDeObraPorKwp: 0, freteImprevistos: 0,
    }
    const premissas: PremissasFinanceiras = {
      bdi: 0, margemLucro: 0, impostos: 0, tma: 0, inflacaoTarifa: 0,
      degradacaoAnual: 0, omAnual: 0, horizonteAnos: 1, fioBSchedule: [1],
    }
    const r = calcularFinanceiro({
      fisico: { numModulos: 0, numInversores: 0, numBaterias: 0, potenciaInstaladaKwp: 1, producaoAnualKwh: 1000, consumoAnualKwh: 0 },
      tarifas: TARIFAS, precos, premissas,
    })
    expect(r.capex.investimentoTotal).toBeCloseTo(1000, 6)
    expect(r.indicadores.lcoe).toBeCloseTo(1, 9)
  })
})

describe('projeção do projeto de teste (propriedades — sem golden fixo)', () => {
  const r = calcularFinanceiro({ fisico: FISICO, tarifas: TARIFAS })

  it('usa os defaults quando precos/premissas não são passados', () => {
    expect(r.capex.investimentoTotal).toBeCloseTo(89681.35135135135, 6)
  })
  it('tem horizonte + 1 linhas, começando no ano 0', () => {
    expect(r.projecao).toHaveLength(PREMISSAS_FINANCEIRAS_PADRAO.horizonteAnos + 1)
    expect(r.projecao[0].ano).toBe(0)
    expect(r.projecao[r.projecao.length - 1].ano).toBe(25)
  })
  it('ano 0 é o desembolso do investimento', () => {
    const a0 = r.projecao[0]
    expect(a0.fluxoLiquido).toBeCloseTo(-r.capex.investimentoTotal, 6)
    expect(a0.fluxoAcumulado).toBeCloseTo(-r.capex.investimentoTotal, 6)
    expect(a0.vplAcumulado).toBeCloseTo(-r.capex.investimentoTotal, 6)
    expect(a0.geracaoKwh).toBe(0)
  })
  it('geração cai ano a ano (degradação dos módulos)', () => {
    for (let t = 2; t <= 25; t++) {
      expect(r.projecao[t].geracaoKwh).toBeLessThan(r.projecao[t - 1].geracaoKwh)
    }
  })
  it('economia cresce nos primeiros anos (inflação supera degradação e rampa)', () => {
    expect(r.projecao[2].economiaLiquida).toBeGreaterThan(r.projecao[1].economiaLiquida)
    expect(r.projecao[3].economiaLiquida).toBeGreaterThan(r.projecao[2].economiaLiquida)
  })
  it('acumulados são coerentes com os fluxos', () => {
    for (let t = 1; t <= 25; t++) {
      expect(r.projecao[t].fluxoAcumulado)
        .toBeCloseTo(r.projecao[t - 1].fluxoAcumulado + r.projecao[t].fluxoLiquido, 6)
      expect(r.projecao[t].vplAcumulado)
        .toBeCloseTo(r.projecao[t - 1].vplAcumulado + r.projecao[t].fluxoDescontado, 6)
    }
  })
  it('projeto de teste é viável: VPL positivo e TIR plausível', () => {
    expect(r.indicadores.vpl).toBeGreaterThan(0)
    expect(r.indicadores.tir).toBeGreaterThan(0)
    expect(r.indicadores.tir).toBeLessThan(1)
  })
  it('payback simples é menor que o descontado, ambos dentro do horizonte', () => {
    const s = r.indicadores.paybackSimplesAnos!
    const d = r.indicadores.paybackDescontadoAnos!
    expect(s).toBeGreaterThan(1)
    expect(d).toBeLessThan(25)
    expect(s).toBeLessThan(d)
  })
  it('indicadores derivados são coerentes', () => {
    expect(r.indicadores.vpl).toBeCloseTo(r.projecao[25].vplAcumulado, 6)
    expect(r.indicadores.indiceVplInvestimento)
      .toBeCloseTo(r.indicadores.vpl / r.capex.investimentoTotal, 9)
    expect(r.indicadores.roi).toBeGreaterThan(0)
    expect(r.indicadores.economiaAcumulada)
      .toBeCloseTo(r.projecao.slice(1).reduce((a, l) => a + l.economiaLiquida, 0), 6)
  })
})

describe('bordas', () => {
  it('horizonte zero devolve só o ano 0 sem NaN', () => {
    const r = calcularFinanceiro({
      fisico: FISICO, tarifas: TARIFAS,
      premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, horizonteAnos: 0 },
    })
    expect(r.projecao).toHaveLength(1)
    expect(r.indicadores.paybackSimplesAnos).toBeNull()
    expect(Number.isNaN(r.indicadores.lcoe)).toBe(false)
    expect(r.indicadores.lcoe).toBe(0)
  })
  it('investimento zero não gera divisão por zero nos índices', () => {
    const precos: PrecosCapex = {
      moduloUnitario: 0, inversorUnitario: 0, bateriaUnitaria: 0, estruturaPorModulo: 0,
      cabeamentoPorKwp: 0, projetoArt: 0, maoDeObraPorKwp: 0, freteImprevistos: 0,
    }
    const r = calcularFinanceiro({ fisico: FISICO, tarifas: TARIFAS, precos })
    expect(r.capex.investimentoTotal).toBe(0)
    expect(r.indicadores.roi).toBe(0)
    expect(r.indicadores.indiceVplInvestimento).toBe(0)
  })
})

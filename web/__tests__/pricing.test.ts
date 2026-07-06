import { describe, it, expect } from 'vitest'
import { calcularPreco } from '@/lib/proposals/pricing'
import type { PricingInput } from '@/lib/proposals/pricing'

// Config mínima necessária para os cálculos
const baseConfig = {
  pct_imposto: 10,
  pct_margem: 20,
  pct_comissao: 5,
  pct_material_ca: 5,
  valor_projeto_por_kwp: 200,
  valor_instalacao_por_placa: 150,
  quilometragem: 2,
} as Parameters<typeof calcularPreco>[1]

const baseInput: PricingInput = {
  kit_value: 10000,
  total_power_kwp: 6,
  panel_qty: 12,
  km_rodados: 50,
}

describe('calcularPreco', () => {
  it('calcula divisor corretamente', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // divisor = 1 - 0.10 - 0.20 - 0.05 = 0.65
    expect(result.divisor).toBeCloseTo(0.65, 5)
  })

  it('calcula custo_kit igual ao kit_value', () => {
    const result = calcularPreco(baseInput, baseConfig)
    expect(result.custo_kit).toBe(10000)
  })

  it('calcula custo_projeto = kwp * valor_por_kwp', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // 6 * 200 = 1200
    expect(result.custo_projeto).toBe(1200)
  })

  it('calcula custo_instalacao = placas * valor_por_placa', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // 12 * 150 = 1800
    expect(result.custo_instalacao).toBe(1800)
  })

  it('calcula custo_km = km * valor_km', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // 50 * 2 = 100
    expect(result.custo_km).toBe(100)
  })

  it('calcula custo_ca = kit_value * pct_ca', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // 10000 * 0.05 = 500
    expect(result.custo_ca).toBe(500)
  })

  it('calcula soma_custos corretamente', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // 10000 + 1200 + 1800 + 100 + 500 = 13600
    expect(result.soma_custos).toBe(13600)
  })

  it('calcula preco_total = soma_custos / divisor', () => {
    const result = calcularPreco(baseInput, baseConfig)
    // 13600 / 0.65 ≈ 20923.07
    expect(result.preco_total).toBeCloseTo(13600 / 0.65, 2)
  })

  it('usa km_rodados = 0 quando não informado', () => {
    const inputSemKm: PricingInput = { ...baseInput, km_rodados: undefined }
    const result = calcularPreco(inputSemKm, baseConfig)
    expect(result.custo_km).toBe(0)
  })

  it('usa divisor = 1 quando divisor seria <= 0', () => {
    const configExcessiva = {
      ...baseConfig,
      pct_imposto: 60,
      pct_margem: 30,
      pct_comissao: 20,
    } as Parameters<typeof calcularPreco>[1]
    const result = calcularPreco(baseInput, configExcessiva)
    // divisor calculado = 1 - 0.6 - 0.3 - 0.2 = -0.1 → clamped para 1
    expect(result.preco_venda_kit).toBe(result.custo_kit)
  })

  it('usa valores default 0 quando config tem nulls', () => {
    const configVazia = {} as Parameters<typeof calcularPreco>[1]
    const result = calcularPreco(baseInput, configVazia)
    // sem impostos/margem/comissão: divisor = 1
    expect(result.divisor).toBe(1)
    expect(result.custo_projeto).toBe(0)
    expect(result.custo_instalacao).toBe(0)
    expect(result.custo_km).toBe(0)
    expect(result.custo_ca).toBe(0)
    expect(result.preco_total).toBeCloseTo(10000, 2)
  })

  it('preco_total é soma dos precos_venda individuais', () => {
    const result = calcularPreco(baseInput, baseConfig)
    const soma =
      result.preco_venda_kit +
      result.preco_venda_projeto +
      result.preco_venda_instalacao +
      result.preco_venda_km +
      result.preco_venda_ca
    expect(result.preco_total).toBeCloseTo(soma, 10)
  })
})

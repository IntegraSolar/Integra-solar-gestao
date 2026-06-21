import type { OrgConfig } from '@/lib/configuracoes/queries'

export type PricingBreakdown = {
  custo_kit: number
  custo_projeto: number
  custo_instalacao: number
  custo_km: number
  custo_ca: number
  soma_custos: number
  divisor: number
  preco_venda_kit: number
  preco_venda_projeto: number
  preco_venda_instalacao: number
  preco_venda_km: number
  preco_venda_ca: number
  preco_total: number
}

export type PricingInput = {
  kit_value: number
  total_power_kwp: number
  panel_qty: number
  km_rodados?: number
}

export function calcularPreco(
  input: PricingInput,
  config: OrgConfig
): PricingBreakdown {
  const {
    kit_value,
    total_power_kwp,
    panel_qty,
    km_rodados = 0,
  } = input

  const pct_imposto  = (config.pct_imposto  ?? 0) / 100
  const pct_margem   = (config.pct_margem   ?? 0) / 100
  const pct_comissao = (config.pct_comissao ?? 0) / 100
  const pct_ca       = (config.pct_material_ca ?? 0) / 100

  const valor_projeto_por_kwp      = config.valor_projeto_por_kwp      ?? 0
  const valor_instalacao_por_placa = config.valor_instalacao_por_placa ?? 0
  const valor_km                   = config.quilometragem              ?? 0

  const divisor = 1 - pct_imposto - pct_margem - pct_comissao

  const custo_kit        = kit_value
  const custo_projeto    = total_power_kwp * valor_projeto_por_kwp
  const custo_instalacao = panel_qty * valor_instalacao_por_placa
  const custo_km         = valor_km * km_rodados
  const custo_ca         = kit_value * pct_ca

  const soma_custos = custo_kit + custo_projeto + custo_instalacao + custo_km + custo_ca

  const d = divisor > 0 ? divisor : 1

  const preco_venda_kit        = custo_kit / d
  const preco_venda_projeto    = custo_projeto / d
  const preco_venda_instalacao = custo_instalacao / d
  const preco_venda_km         = custo_km / d
  const preco_venda_ca         = custo_ca / d

  const preco_total = preco_venda_kit + preco_venda_projeto + preco_venda_instalacao + preco_venda_km + preco_venda_ca

  return {
    custo_kit,
    custo_projeto,
    custo_instalacao,
    custo_km,
    custo_ca,
    soma_custos,
    divisor,
    preco_venda_kit,
    preco_venda_projeto,
    preco_venda_instalacao,
    preco_venda_km,
    preco_venda_ca,
    preco_total,
  }
}

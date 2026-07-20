// web/lib/comissoes/calculo.ts

/** Linha crua vinda do join client_commissions + client_sale. */
export type ComissaoRow = {
  id: string
  client_id: string
  client_name: string
  status: string
  paid_at: string | null
  comprovante_url: string | null
  created_at: string
  /** Valor gravado em client_commissions na confirmação da compra (histórico). */
  valor_congelado: number
  sale_value: number | null
  commission_pct: number | null
  commission_seller: string | null
}

export type ComissaoCalculada = {
  id: string
  client_id: string
  client_name: string
  vendedor_name: string
  commission_pct: number
  valor_comissao: number
  status: string
  paid_at: string | null
  comprovante_url: string | null
  created_at: string
}

export function calcularValorComissao(saleValue: number | null, pct: number | null): number {
  if (!saleValue || !pct) return 0
  return Math.round(saleValue * pct) / 100
}

/**
 * Monta o item de comissão a partir do cadastro da venda (aba "Vendas e Faturamento").
 *
 * O vendedor e o percentual são lidos de client_sale, não do responsável pelo lead,
 * e o valor é recalculado sempre — corrigir o percentual no cadastro corrige a comissão.
 *
 * Sem vendedor preenchido não há comissão a pagar: a linha é descartada.
 */
export function montarComissaoItem(row: ComissaoRow): ComissaoCalculada | null {
  const vendedor = (row.commission_seller ?? '').trim()
  if (!vendedor) return null
  if (row.sale_value === null) return null

  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.client_name,
    vendedor_name: vendedor,
    commission_pct: row.commission_pct ?? 0,
    valor_comissao: calcularValorComissao(row.sale_value, row.commission_pct),
    status: row.status,
    paid_at: row.paid_at,
    comprovante_url: row.comprovante_url,
    created_at: row.created_at,
  }
}

export function totaisComissoes(items: ComissaoCalculada[]): {
  total_pendente: number
  total_pago: number
} {
  let total_pendente = 0
  let total_pago = 0
  for (const i of items) {
    if (i.status === 'paga') total_pago += i.valor_comissao
    else if (i.status === 'pendente') total_pendente += i.valor_comissao
  }
  return { total_pendente, total_pago }
}

// web/lib/comissoes/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getMonthRangeBRT } from '@/lib/utils/date-range'
import { montarComissaoItem, totaisComissoes, type ComissaoRow } from './calculo'

export type ComissaoItem = {
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

export type ComissoesPainel = {
  items: ComissaoItem[]
  total_pendente: number
  total_pago: number
}

export type ComissaoMember = {
  id: string
  name: string
}

// O vendedor e o percentual vêm do cadastro da venda (aba "Vendas e Faturamento"),
// não do responsável pelo lead.
const SELECT_COMISSAO = `
  id,
  client_id,
  valor_comissao,
  status,
  paid_at,
  comprovante_url,
  created_at,
  clients!inner ( name, client_sale ( sale_value, commission_pct, commission_seller ) )
`

function toRow(r: any): ComissaoRow {
  const sale = Array.isArray(r.clients?.client_sale) ? r.clients.client_sale[0] : r.clients?.client_sale
  return {
    id: r.id,
    client_id: r.client_id,
    client_name: r.clients.name,
    status: r.status,
    paid_at: r.paid_at ?? null,
    comprovante_url: r.comprovante_url ?? null,
    created_at: r.created_at,
    valor_congelado: Number(r.valor_comissao ?? 0),
    sale_value: sale?.sale_value != null ? Number(sale.sale_value) : null,
    commission_pct: sale?.commission_pct != null ? Number(sale.commission_pct) : null,
    commission_seller: sale?.commission_seller ?? null,
  }
}

export async function getComissoesPainel(params: {
  month: number
  year: number
  vendedor?: string
  dateField?: 'created_at' | 'paid_at'
}): Promise<ComissoesPainel> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { items: [], total_pendente: 0, total_pago: 0 }

  const supabase = await createClient()
  const dateField = params.dateField ?? 'created_at'
  const { startISO, endISO } = getMonthRangeBRT(params.month, params.year)

  const { data, error } = await supabase
    .from('client_commissions')
    .select(SELECT_COMISSAO)
    .eq('organization_id', orgId)
    .gte(dateField, startISO)
    .lte(dateField, endISO)

  if (error || !data) return { items: [], total_pendente: 0, total_pago: 0 }

  // Sem vendedor preenchido no cadastro não há comissão a pagar — montarComissaoItem
  // devolve null e a linha sai da lista e dos totais.
  let items = data
    .map((r: any) => montarComissaoItem(toRow(r)))
    .filter((i): i is ComissaoItem => i !== null)

  if (params.vendedor) {
    items = items.filter((i) => i.vendedor_name === params.vendedor)
  }

  return { items, ...totaisComissoes(items) }
}

export async function getComissaoById(commissionId: string): Promise<ComissaoItem | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_commissions')
    .select(SELECT_COMISSAO)
    .eq('id', commissionId)
    .eq('organization_id', orgId)
    .single()

  if (error || !data) return null
  return montarComissaoItem(toRow(data))
}

/** Vendedores disponíveis no filtro: nomes distintos digitados no cadastro das vendas. */
export async function getComissoesMembers(): Promise<ComissaoMember[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('client_sale')
    .select('commission_seller')
    .eq('organization_id', orgId)

  const nomes = new Set<string>()
  for (const r of (data ?? []) as any[]) {
    const nome = (r.commission_seller ?? '').trim()
    if (nome) nomes.add(nome)
  }

  return [...nomes]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((name) => ({ id: name, name }))
}

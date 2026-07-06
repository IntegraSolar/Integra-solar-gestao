// web/lib/compras/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type CompraClient = {
  id: string
  client_id: string
  client_name: string
  fornecedor: string | null
  itens: string | null
  valor: number | null
  data_prevista: string | null
  status: string
  nf_url: string | null
  comprovante_url: string | null
  dias_usados: number
  dias_em_compras: number
  contract_max_days: number | null
  primeira_parcela_confirmed_at: string | null
}

export async function getCompras(): Promise<CompraClient[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_purchases')
    .select(`
      id,
      client_id,
      fornecedor,
      itens,
      valor,
      data_prevista,
      status,
      nf_url,
      comprovante_url,
      clients!inner (
        name,
        contract_max_days,
        delivery_start_date
      )
    `)
    .eq('organization_id', orgId)
    .eq('status', 'aguardando')

  if (error || !data) return []

  const clientIds: string[] = data.map((r: any) => r.client_id)
  const { data: parcelas } = await (supabase as any)
    .from('client_installments')
    .select('client_id, confirmed_at')
    .in('client_id', clientIds)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)

  const parcelaMap: Record<string, string> = {}
  for (const p of parcelas ?? []) {
    parcelaMap[p.client_id] = p.confirmed_at
  }

  return data.map((r: any) => {
    const startDate = r.clients.delivery_start_date ?? parcelaMap[r.client_id] ?? null
    const diasUsados = startDate
      ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
      : 0
    const diasEmCompras = r.created_at
      ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
      : 0

    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      fornecedor: r.fornecedor ?? null,
      itens: r.itens ?? null,
      valor: r.valor ?? null,
      data_prevista: r.data_prevista ?? null,
      status: r.status,
      nf_url: r.nf_url ?? null,
      comprovante_url: r.comprovante_url ?? null,
      dias_usados: diasUsados,
      dias_em_compras: diasEmCompras,
      contract_max_days: r.clients.contract_max_days ?? null,
      primeira_parcela_confirmed_at: startDate,
    }
  })
}

export async function getCompraById(clientId: string): Promise<CompraClient | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_purchases')
    .select(`
      id,
      client_id,
      fornecedor,
      itens,
      valor,
      data_prevista,
      status,
      nf_url,
      comprovante_url,
      clients!inner (
        name,
        contract_max_days,
        delivery_start_date
      )
    `)
    .eq('organization_id', orgId)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const startDate = data.clients.delivery_start_date ?? null
  const diasUsados = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
    : 0
  const diasEmCompras = data.created_at
    ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    fornecedor: data.fornecedor ?? null,
    itens: data.itens ?? null,
    valor: data.valor ?? null,
    data_prevista: data.data_prevista ?? null,
    status: data.status,
    nf_url: data.nf_url ?? null,
    comprovante_url: data.comprovante_url ?? null,
    dias_usados: diasUsados,
    dias_em_compras: diasEmCompras,
    contract_max_days: data.clients.contract_max_days ?? null,
    primeira_parcela_confirmed_at: startDate,
  }
}

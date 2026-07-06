// web/lib/comissoes/queries.ts
import { createClient } from '@/lib/supabase/server'

export type ComissaoItem = {
  id: string
  client_id: string
  client_name: string
  vendedor_id: string | null
  vendedor_name: string | null
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

export async function getComissoesPainel(params: {
  month: number
  year: number
  vendedorId?: string
}): Promise<ComissoesPainel> {
  const supabase = await createClient()

  const startDate = new Date(params.year, params.month - 1, 1).toISOString()
  const endDate = new Date(params.year, params.month, 1).toISOString()

  let query = (supabase as any)
    .from('client_commissions')
    .select(`
      id,
      client_id,
      vendedor_id,
      valor_comissao,
      status,
      paid_at,
      comprovante_url,
      created_at,
      clients!inner ( name )
    `)
    .gte('created_at', startDate)
    .lt('created_at', endDate)

  if (params.vendedorId) {
    query = query.eq('vendedor_id', params.vendedorId)
  }

  const { data, error } = await query
  if (error || !data) return { items: [], total_pendente: 0, total_pago: 0 }

  // Resolve vendedor names
  const vendedorIds = Array.from(new Set(data.map((r: any) => r.vendedor_id).filter(Boolean))) as string[]
  const vendedorMap: Record<string, string> = {}
  if (vendedorIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', vendedorIds)
    for (const p of profiles ?? []) {
      vendedorMap[p.id] = p.full_name
    }
  }

  const items: ComissaoItem[] = data.map((r: any) => ({
    id: r.id,
    client_id: r.client_id,
    client_name: r.clients.name,
    vendedor_id: r.vendedor_id ?? null,
    vendedor_name: r.vendedor_id ? (vendedorMap[r.vendedor_id] ?? null) : null,
    valor_comissao: r.valor_comissao,
    status: r.status,
    paid_at: r.paid_at ?? null,
    comprovante_url: r.comprovante_url ?? null,
    created_at: r.created_at,
  }))

  const total_pendente = items
    .filter((i) => i.status === 'pendente')
    .reduce((sum, i) => sum + i.valor_comissao, 0)

  const total_pago = items
    .filter((i) => {
      if (i.status !== 'paga' || !i.paid_at) return false
      const paid = new Date(i.paid_at)
      return paid >= new Date(startDate) && paid < new Date(endDate)
    })
    .reduce((sum, i) => sum + i.valor_comissao, 0)

  return { items, total_pendente, total_pago }
}

export async function getComissaoById(commissionId: string): Promise<ComissaoItem | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_commissions')
    .select(`
      id,
      client_id,
      vendedor_id,
      valor_comissao,
      status,
      paid_at,
      comprovante_url,
      created_at,
      clients!inner ( name )
    `)
    .eq('id', commissionId)
    .single()

  if (error || !data) return null

  let vendedorName: string | null = null
  if (data.vendedor_id) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', data.vendedor_id)
      .single()
    vendedorName = profile?.full_name ?? null
  }

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    vendedor_id: data.vendedor_id ?? null,
    vendedor_name: vendedorName,
    valor_comissao: data.valor_comissao,
    status: data.status,
    paid_at: data.paid_at ?? null,
    comprovante_url: data.comprovante_url ?? null,
    created_at: data.created_at,
  }
}

export async function getComissoesMembers(): Promise<ComissaoMember[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('profiles')
    .select('id, full_name')
    .order('full_name')
  return (data ?? []).map((p: any) => ({ id: p.id, name: p.full_name }))
}

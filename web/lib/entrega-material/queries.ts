import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type EntregaMaterialChecklist = {
  limpeza: boolean
  manuais: boolean
  orientacao_uso: boolean
}

export type EntregaMaterialClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_entrega: string | null
  termo_url: string | null
  checklist: EntregaMaterialChecklist
  status: string
  dias_usados: number
  contract_max_days: number | null
}

export async function getEntregasMaterial(): Promise<EntregaMaterialClient[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('client_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days
      )
    `)
    .eq('organization_id', orgId)
    .neq('status', 'concluida')

  if (error || !data) return []

  const clientIds: string[] = data.map((r: any) => r.client_id)
  const { data: parcelas } = await supabase
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
    const confirmedAt = parcelaMap[r.client_id] ?? null
    const diasUsados = confirmedAt
      ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_entrega: r.data_entrega ?? null,
      termo_url: r.termo_url ?? null,
      checklist: (r.checklist as EntregaMaterialChecklist) ?? { limpeza: false, manuais: false, orientacao_uso: false },
      status: r.status,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getEntregaMaterialById(clientId: string): Promise<EntregaMaterialClient | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('client_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days
      )
    `)
    .eq('organization_id', orgId)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const { data: parcela } = await supabase
    .from('client_installments')
    .select('confirmed_at')
    .eq('client_id', clientId)
    .eq('position', 1)
    .not('confirmed_at', 'is', null)
    .maybeSingle()

  const confirmedAt = parcela?.confirmed_at ?? null
  const diasUsados = confirmedAt
    ? Math.floor((Date.now() - new Date(confirmedAt).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_entrega: data.data_entrega ?? null,
    termo_url: data.termo_url ?? null,
    checklist: (data.checklist as EntregaMaterialChecklist) ?? { limpeza: false, manuais: false, orientacao_uso: false },
    status: data.status,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}

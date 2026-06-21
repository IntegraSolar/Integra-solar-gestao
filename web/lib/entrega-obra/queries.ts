import { createClient } from '@/lib/supabase/server'

export type EntregaObraChecklist = {
  vistoria: boolean
  fotos: boolean
  cliente_ok: boolean
}

export type EntregaObraClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_entrega: string | null
  termo_url: string | null
  observacoes: string | null
  checklist: EntregaObraChecklist
  status: string
  dias_usados: number
  contract_max_days: number | null
}

export async function getEntregasObra(): Promise<EntregaObraClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obra_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      observacoes,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days,
        delivery_start_date,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>entrega_obra', 'is', null)
    .neq('status', 'concluida')

  if (error || !data) return []

  return data.map((r: any) => {
    const startDate = r.clients.delivery_start_date ?? null
    const diasUsados = startDate
      ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_entrega: r.data_entrega ?? null,
      termo_url: r.termo_url ?? null,
      observacoes: r.observacoes ?? null,
      checklist: r.checklist ?? { vistoria: false, fotos: false, cliente_ok: false },
      status: r.status,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getEntregaObraById(clientId: string): Promise<EntregaObraClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obra_deliveries')
    .select(`
      id,
      client_id,
      data_entrega,
      termo_url,
      observacoes,
      checklist,
      status,
      clients!inner (
        name,
        city,
        contract_max_days,
        delivery_start_date
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const startDate = data.clients.delivery_start_date ?? null
  const diasUsados = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_entrega: data.data_entrega ?? null,
    termo_url: data.termo_url ?? null,
    observacoes: data.observacoes ?? null,
    checklist: data.checklist ?? { vistoria: false, fotos: false, cliente_ok: false },
    status: data.status,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}

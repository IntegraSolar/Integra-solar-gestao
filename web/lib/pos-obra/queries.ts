import { createClient } from '@/lib/supabase/server'

export type PosObraClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_contato: string | null
  nps: number | null
  observacoes: string | null
  status: string
  dias_usados: number
  contract_max_days: number | null
}

export async function getPosObras(): Promise<PosObraClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_pos_obra')
    .select(`
      id,
      client_id,
      data_contato,
      nps,
      observacoes,
      status,
      clients!inner (
        name,
        city,
        contract_max_days,
        delivery_start_date,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>pos_obra', 'is', null)
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
      data_contato: r.data_contato ?? null,
      nps: r.nps ?? null,
      observacoes: r.observacoes ?? null,
      status: r.status,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
    }
  })
}

export async function getPosObraById(clientId: string): Promise<PosObraClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_pos_obra')
    .select(`
      id,
      client_id,
      data_contato,
      nps,
      observacoes,
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
    data_contato: data.data_contato ?? null,
    nps: data.nps ?? null,
    observacoes: data.observacoes ?? null,
    status: data.status,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
  }
}

import { createClient } from '@/lib/supabase/server'

export type ObraClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  data_inicio: string | null
  data_prevista: string | null
  status: string
  responsavel_id: string | null
  responsavel_name: string | null
  equipe_nome: string | null
  dias_usados: number
  contract_max_days: number | null
  has_adaptation_works: boolean
  adaptation_details: string[]
}

export type ObraMember = {
  id: string
  name: string
}

export async function getObras(): Promise<ObraClient[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obras')
    .select(`
      id,
      client_id,
      data_inicio,
      data_prevista,
      status,
      responsavel_id,
      equipe_nome,
      clients!inner (
        name,
        city,
        contract_max_days,
        delivery_start_date,
        has_adaptation_works,
        adaptation_details,
        pipeline_flags
      )
    `)
    .not('clients.pipeline_flags->>obra', 'is', null)
    .neq('status', 'concluida')

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

  const responsavelIds = Array.from(new Set(data.map((r: any) => r.responsavel_id).filter(Boolean))) as string[]
  const responsavelMap: Record<string, string> = {}
  if (responsavelIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', responsavelIds)
    for (const p of profiles ?? []) {
      responsavelMap[p.id] = p.full_name
    }
  }

  return data.map((r: any) => {
    const startDate = r.clients.delivery_start_date ?? parcelaMap[r.client_id] ?? null
    const diasUsados = startDate
      ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
      : 0
    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      data_inicio: r.data_inicio ?? null,
      data_prevista: r.data_prevista ?? null,
      status: r.status,
      responsavel_id: r.responsavel_id ?? null,
      responsavel_name: r.responsavel_id ? (responsavelMap[r.responsavel_id] ?? null) : null,
      equipe_nome: r.equipe_nome ?? null,
      dias_usados: diasUsados,
      contract_max_days: r.clients.contract_max_days ?? null,
      has_adaptation_works: r.clients.has_adaptation_works ?? false,
      adaptation_details: (() => { try { return JSON.parse(r.clients.adaptation_details ?? '[]') } catch { return [] } })(),
    }
  })
}

export async function getObraById(clientId: string): Promise<ObraClient | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_obras')
    .select(`
      id,
      client_id,
      data_inicio,
      data_prevista,
      status,
      responsavel_id,
      equipe_nome,
      clients!inner (
        name,
        city,
        contract_max_days,
        delivery_start_date,
        has_adaptation_works,
        adaptation_details
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null

  const startDate = data.clients.delivery_start_date ?? null
  const diasUsados = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
    : 0

  let responsavelName: string | null = null
  if (data.responsavel_id) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('name')
      .eq('id', data.responsavel_id)
      .single()
    responsavelName = profile?.name ?? null
  }

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    data_inicio: data.data_inicio ?? null,
    data_prevista: data.data_prevista ?? null,
    status: data.status,
    responsavel_id: data.responsavel_id ?? null,
    responsavel_name: responsavelName,
    equipe_nome: data.equipe_nome ?? null,
    dias_usados: diasUsados,
    contract_max_days: data.clients.contract_max_days ?? null,
    has_adaptation_works: data.clients.has_adaptation_works ?? false,
    adaptation_details: (() => { try { return JSON.parse(data.clients.adaptation_details ?? '[]') } catch { return [] } })(),
  }
}

export async function getObraMembers(): Promise<ObraMember[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any).from('profiles').select('id, full_name').order('full_name')
  return (data ?? []).map((p: any) => ({ id: p.id, name: p.full_name ?? '—' }))
}

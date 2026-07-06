// web/lib/projetos/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ProjetoChecklist = {
  memorial_calculo: boolean
  art: boolean
  homologacao: boolean
}

export type ProjetoClient = {
  id: string
  client_id: string
  client_name: string
  client_city: string | null
  responsavel_id: string | null
  responsavel_name: string | null
  numero_processo: string | null
  data_protocolo: string | null
  prazo_protocolo: string | null
  data_solicitacao_vistoria: string | null
  prazo_vistoria: string | null
  status: string
  checklist: ProjetoChecklist
  dias_usados: number
  dias_em_projetos: number
  contract_max_days: number | null
  primeira_parcela_confirmed_at: string | null
  art_url: string | null
  projeto_url: string | null
  parecer_acesso_url: string | null
}

export type ProjetoMember = {
  id: string
  name: string
}

export async function getProjetos(): Promise<ProjetoClient[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_projects')
    .select(`
      id,
      client_id,
      responsavel_id,
      responsavel_nome,
      numero_processo,
      data_protocolo,
      prazo_protocolo,
      data_solicitacao_vistoria,
      prazo_vistoria,
      status,
      checklist,
      art_url,
      projeto_url,
      parecer_acesso_url,
      clients!inner (
        name,
        city,
        contract_max_days,
        delivery_start_date
      )
    `)
    .eq('organization_id', orgId)
    .neq('status', 'aprovado')

  if (error || !data) return []

  // Fetch primeira parcela confirmed_at for prazo global
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
    const diasEmProjetos = r.created_at
      ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
      : 0

    return {
      id: r.id,
      client_id: r.client_id,
      client_name: r.clients.name,
      client_city: r.clients.city ?? null,
      responsavel_id: r.responsavel_id ?? null,
      responsavel_name: r.responsavel_nome ?? null,
      numero_processo: r.numero_processo ?? null,
      data_protocolo: r.data_protocolo ?? null,
      prazo_protocolo: r.prazo_protocolo ?? null,
      data_solicitacao_vistoria: r.data_solicitacao_vistoria ?? null,
      prazo_vistoria: r.prazo_vistoria ?? null,
      status: r.status,
      checklist: r.checklist ?? { memorial_calculo: false, art: false, homologacao: false },
      dias_usados: diasUsados,
      dias_em_projetos: diasEmProjetos,
      contract_max_days: r.clients.contract_max_days ?? null,
      primeira_parcela_confirmed_at: startDate,
      art_url: r.art_url ?? null,
      projeto_url: r.projeto_url ?? null,
      parecer_acesso_url: r.parecer_acesso_url ?? null,
    }
  })
}

export async function getProjetoById(clientId: string): Promise<ProjetoClient | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('client_projects')
    .select(`
      id,
      client_id,
      responsavel_id,
      responsavel_nome,
      numero_processo,
      data_protocolo,
      prazo_protocolo,
      data_solicitacao_vistoria,
      prazo_vistoria,
      status,
      checklist,
      art_url,
      projeto_url,
      parecer_acesso_url,
      clients!inner (
        name,
        city,
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
  const diasEmProjetos = data.created_at
    ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000)
    : 0

  return {
    id: data.id,
    client_id: data.client_id,
    client_name: data.clients.name,
    client_city: data.clients.city ?? null,
    responsavel_id: data.responsavel_nome ?? data.responsavel_id ?? null,
    responsavel_name: data.responsavel_nome ?? null,
    numero_processo: data.numero_processo ?? null,
    data_protocolo: data.data_protocolo ?? null,
    prazo_protocolo: data.prazo_protocolo ?? null,
    data_solicitacao_vistoria: data.data_solicitacao_vistoria ?? null,
    prazo_vistoria: data.prazo_vistoria ?? null,
    status: data.status,
    checklist: data.checklist ?? { memorial_calculo: false, art: false, homologacao: false },
    dias_usados: diasUsados,
    dias_em_projetos: diasEmProjetos,
    contract_max_days: data.clients.contract_max_days ?? null,
    primeira_parcela_confirmed_at: startDate,
    art_url: data.art_url ?? null,
    projeto_url: data.projeto_url ?? null,
    parecer_acesso_url: data.parecer_acesso_url ?? null,
  }
}

export async function getProjetoMembers(): Promise<ProjetoMember[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('organization_members')
    .select('user_id, profiles!user_id(id, full_name)')
    .eq('organization_id', orgId)
    .eq('role', 'projetista')

  return (data ?? []).map((m: any) => ({
    id: m.profiles?.id ?? m.user_id,
    name: m.profiles?.full_name ?? 'Projetista',
  }))
}

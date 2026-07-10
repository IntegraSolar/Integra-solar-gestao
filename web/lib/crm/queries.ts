// web/lib/crm/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { Lead, FunnelStage, LeadSource, Proposal, Supplier } from './types'

export async function getFunnelStages(): Promise<FunnelStage[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organization_id', user.membership.organization.id)
    .order('order', { ascending: true })
  return (data as any as FunnelStage[]) ?? []
}

export async function getLeadSources(): Promise<LeadSource[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('lead_sources')
    .select('id, name')
    .eq('organization_id', user.membership.organization.id)
    .order('name')
  return (data as any) ?? []
}

export async function getOrgMembers() {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient()
  const { data } = await (adminClient as any)
    .from('organization_members')
    .select('user_id, profiles!user_id(id, full_name, email)')
    .eq('organization_id', user.membership.organization.id)
  return (data ?? []).map((m: any) => ({
    id: m.profiles?.id ?? m.user_id,
    full_name: m.profiles?.full_name ?? null,
    email: m.profiles?.email ?? '',
  })).filter((m: any) => m.id)
}

export async function getLeads(): Promise<Lead[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select(`
      *,
      stage:pipeline_stages(id, name, color, is_final_stage, is_terminal_won, is_terminal_lost, order),
      assigned_user:profiles!assigned_to_user_id(id, full_name, email),
      lead_source:lead_sources(id, name)
    `)
    .eq('organization_id', user.membership.organization.id)
    .order('created_at', { ascending: false })
    .limit(200)
  const leads = (data ?? []) as any[]
  return leads.map((l) => ({ ...l, notes: [], followups: [] })) as Lead[]
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select(`
      *,
      stage:pipeline_stages(id, name, color, is_final_stage, is_terminal_won, is_terminal_lost, order),
      assigned_user:profiles!assigned_to_user_id(id, full_name, email),
      lead_source:lead_sources(id, name),
      notes:lead_notes(id, content, created_at, created_by, author:profiles!created_by(full_name, email)),
      followups:tasks!related_to_lead_id(id, title, description, due_date, completed_at, assigned_to_user_id)
    `)
    .eq('id', id)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  const lead = data as any
  return { ...lead, notes: lead.notes ?? [], followups: lead.followups ?? [] } as Lead
}

export async function getProposalsByLead(leadId: string): Promise<Proposal[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('proposals')
    .select(`*, supplier:suppliers(id, name)`)
    .eq('lead_id', leadId)
    .eq('organization_id', user.membership.organization.id)
    .order('created_at', { ascending: false })
  const proposals = (data ?? []) as any[]
  return proposals.map((p) => ({
    id: p.id,
    lead_id: p.lead_id,
    name: p.name ?? 'Proposta',
    panel_qty: p.total_modules ?? 0,
    panel_power_w: p.module_power_wp ?? 0,
    panel_brand_model: p.panel_brand_model ?? null,
    inverter_qty: p.total_inverters ?? 0,
    inverter_power_w: p.inverter_power_w ?? 0,
    inverter_brand_model: p.inverter_brand_model ?? null,
    kit_value: p.kit_value ?? 0,
    km_rodados: p.km_rodados ?? 0,
    total_power_kwp: p.total_power_kwp ?? 0,
    monthly_generation_kwh: p.monthly_generation_kwh ?? 0,
    status: p.status ?? 'draft',
    created_at: p.created_at,
    supplier: p.supplier ?? null,
    template_id: p.template_id ?? null,
    preco_total: p.preco_total ?? null,
    custo_kit: p.custo_kit ?? null,
    custo_projeto: p.custo_projeto ?? null,
    custo_instalacao: p.custo_instalacao ?? null,
    custo_km: p.custo_km ?? null,
    custo_ca: p.custo_ca ?? null,
    valor_entrada: p.valor_entrada ?? null,
    valor_parcelas: p.valor_parcelas ?? null,
    num_parcelas: p.num_parcelas ?? null,
    pdf_url: p.pdf_url ?? null,
    docx_url: p.docx_url ?? null,
    gerado_em: p.gerado_em ?? null,
    preco_calculado: p.preco_calculado ?? null,
    ajuste_tipo: p.ajuste_tipo ?? null,
    ajuste_valor: p.ajuste_valor ?? null,
    ajuste_percentual: p.ajuste_percentual ?? null,
    ajuste_motivo: p.ajuste_motivo ?? null,
    ajuste_aplicado_por: p.ajuste_aplicado_por ?? null,
    ajuste_aplicado_em: p.ajuste_aplicado_em ?? null,
    preco_final: p.preco_final ?? null,
  })) as Proposal[]
}

export async function getSuppliers(): Promise<Supplier[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('organization_id', user.membership.organization.id)
    .order('name')
  return (data as any) ?? []
}

// Retorna fator de geração da org (padrão 1.0 se não configurado)
export async function getGenerationFactor(): Promise<number> {
  const user = await getCurrentUserData()
  if (!user?.membership) return 1.0
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_config')
    .select('kwh_por_kwp')
    .eq('organization_id', user.membership.organization.id)
    .maybeSingle()
  return (data?.kwh_por_kwp as number) ?? 1.0
}

// Cria etapas padrão se a org não tiver nenhuma
export async function ensureDefaultStages(orgId: string): Promise<void> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('pipeline_stages')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if (count && count > 0) return
  const defaults = [
    { name: 'Chegada de Leads', order: 1, color: '#6B7A90' },
    { name: 'Proposta Enviada', order: 2, color: '#F59E0B' },
    { name: 'Follow-up', order: 3, color: '#3B82F6' },
    { name: 'Próximos de Fechamento', order: 4, color: '#8B5CF6' },
    { name: 'Contrato Assinado', order: 5, color: '#10B981', is_terminal_won: true },
  ]
  await supabase.from('pipeline_stages').insert(
    defaults.map((d) => ({ ...d, organization_id: orgId })) as any
  )
}

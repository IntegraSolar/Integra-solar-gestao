// web/lib/crm/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from './types'

// ── Helpers ───────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}


// ── Lead Actions ──────────────────────────────────────────────────

const leadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  city: z.string().optional(),
  observations: z.string().optional(),
  system_type: z.string().optional(),
  estimated_kwp: z.coerce.number().optional(),
  estimated_value: z.coerce.number().optional(),
  current_stage_id: z.string().uuid('Etapa inválida'),
  assigned_to_user_id: z.string().uuid().optional().or(z.literal('')),
  lead_source_id: z.string().uuid().optional().or(z.literal('')),
  next_action_date: z.string().optional(),
})

export async function createLead(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = leadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { assigned_to_user_id, lead_source_id, estimated_kwp, estimated_value, next_action_date, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('leads').insert({
    ...rest,
    estimated_kwp: estimated_kwp ?? null,
    estimated_value: estimated_value ?? null,
    assigned_to_user_id: assigned_to_user_id || null,
    lead_source_id: lead_source_id || null,
    next_action_date: next_action_date || null,
    organization_id: orgId,
  })

  if (error) return { error: error.message }
  await logAction('Lead criado', `Nome: ${parsed.data.name}`)
  revalidatePath('/leads')
  return { success: 'Lead criado.' }
}

export async function updateLead(
  leadId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = leadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { assigned_to_user_id, lead_source_id, estimated_kwp, estimated_value, next_action_date, ...rest } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('leads').update({
    ...rest,
    estimated_kwp: estimated_kwp ?? null,
    estimated_value: estimated_value ?? null,
    assigned_to_user_id: assigned_to_user_id || null,
    lead_source_id: lead_source_id || null,
    next_action_date: next_action_date || null,
  }).eq('id', leadId).eq('organization_id', orgId)

  if (error) return { error: error.message }
  await logAction('Lead atualizado', `Nome: ${parsed.data.name}`)
  revalidatePath('/leads')
  return { success: 'Lead atualizado.' }
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase.from('leads').delete().eq('id', leadId).eq('organization_id', orgId)
  if (error) return { error: error.message }
  await logAction('Lead excluído', `ID: ${leadId}`)
  revalidatePath('/leads')
  return { success: 'Lead excluído.' }
}

export async function moveLeadStage(leadId: string, stageId: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ current_stage_id: stageId })
    .eq('id', leadId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa atualizada.' }
}

// ── Note Actions ──────────────────────────────────────────────────
// lead_notes table is not yet in the generated DB types; using `any` cast to avoid tsc errors.

export async function createNote(leadId: string, content: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  const userId = user?.profile.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!content.trim()) return { error: 'Anotação não pode ser vazia.' }

  const supabase = await createClient()
  const { error } = await supabase.from('lead_notes').insert({
    lead_id: leadId,
    organization_id: orgId,
    created_by: userId,
    content: content.trim(),
  })
  if (error) return { error: (error as any).message }
  revalidatePath('/leads')
  return { success: 'Anotação salva.' }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId).eq('organization_id', orgId)
  if (error) return { error: (error as any).message }
  revalidatePath('/leads')
  return { success: 'Anotação excluída.' }
}

// ── Follow-up Actions ─────────────────────────────────────────────

const followUpSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  due_date: z.string().min(1, 'Data é obrigatória'),
  due_time: z.string().optional(),
})

export async function createFollowUp(
  leadId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  const userId = user?.profile.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = followUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert({
    organization_id: orgId,
    related_to_lead_id: leadId,
    assigned_to_user_id: userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_date: parsed.data.due_time
      ? `${parsed.data.due_date}T${parsed.data.due_time}:00`
      : parsed.data.due_date,
  })
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Follow-up agendado.' }
}

export async function toggleFollowUp(taskId: string, done: boolean): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq('id', taskId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Follow-up atualizado.' }
}

// ── Proposal Actions ──────────────────────────────────────────────

const proposalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  panel_qty: z.coerce.number().min(0).optional(),
  panel_power_w: z.coerce.number().min(0).optional(),
  panel_brand_model: z.string().optional(),
  inverter_qty: z.coerce.number().min(0).optional(),
  inverter_power_w: z.coerce.number().min(0).optional(),
  inverter_brand_model: z.string().optional(),
  kit_value: z.coerce.number().min(0),
  km_rodados: z.coerce.number().min(0).optional(),
  supplier_name: z.string().optional(),
  total_power_kwp: z.coerce.number().min(0),
  monthly_generation_kwh: z.coerce.number().min(0),
})

export async function createProposal(
  leadId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  const userId = user?.profile.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = proposalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const d = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('proposals').insert({
    name: d.name,
    total_modules: d.panel_qty ?? 0,
    module_power_wp: d.panel_power_w ?? 0,
    panel_brand_model: d.panel_brand_model || null,
    total_inverters: d.inverter_qty ?? 0,
    inverter_power_w: d.inverter_power_w ?? 0,
    inverter_brand_model: d.inverter_brand_model || null,
    kit_value: d.kit_value,
    km_rodados: d.km_rodados ?? 0,
    total_power_kwp: d.total_power_kwp,
    monthly_generation_kwh: d.monthly_generation_kwh,
    supplier_name: d.supplier_name || null,
    lead_id: leadId,
    organization_id: orgId,
    created_by_user_id: userId,
  } as any)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Proposta criada.' }
}

export async function deleteProposal(proposalId: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase.from('proposals').delete().eq('id', proposalId).eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Proposta excluída.' }
}

// ── Funnel Stage Actions ──────────────────────────────────────────

export async function createFunnelStage(
  name: string,
  order: number
): Promise<ActionResult & { stage?: { id: string; name: string; color: string; order: number; is_terminal_won: boolean; is_terminal_lost: boolean; is_final_stage: boolean; organization_id: string } }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert({ organization_id: orgId, name, order, color: '#6B7A90' })
    .select('id, name, color, order, is_terminal_won, is_terminal_lost, is_final_stage, organization_id')
    .single()
  if (error) return { error: error.message }
  return { success: 'Etapa criada.', stage: data }
}

export async function updateFunnelStage(
  stageId: string,
  updates: { name?: string; color?: string; order?: number; is_final_stage?: boolean }
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('pipeline_stages')
    .update(updates)
    .eq('id', stageId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa atualizada.' }
}

export async function deleteFunnelStage(stageId: string, moveTo: string): Promise<ActionResult> {
  // RLS policy 'pipeline_stages_org_isolation' scopes this to the current user's org
  const supabase = await createClient()
  // Move leads para outra etapa antes de excluir
  await supabase.from('leads').update({ current_stage_id: moveTo }).eq('current_stage_id', stageId)
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId)
  if (error) return { error: error.message }
  revalidatePath('/leads')
  return { success: 'Etapa excluída.' }
}

export async function reorderFunnelStages(stages: { id: string; order: number }[]): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  // Dois passos para evitar conflito de unique constraint (organization_id, order)
  const offset = 10000
  for (const s of stages) {
    const { error } = await supabase
      .from('pipeline_stages')
      .update({ order: s.order + offset })
      .eq('id', s.id)
      .eq('organization_id', orgId)
    if (error) return { error: 'Erro ao reordenar etapas: ' + error.message }
  }
  for (const s of stages) {
    const { error } = await supabase
      .from('pipeline_stages')
      .update({ order: s.order })
      .eq('id', s.id)
      .eq('organization_id', orgId)
    if (error) return { error: 'Erro ao confirmar ordem: ' + error.message }
  }
  revalidatePath('/leads')
  revalidatePath('/leads/configurar-funil')
  return { success: 'Ordem salva.' }
}

// ── Convert Lead to Client ────────────────────────────────────────

export async function convertLeadToClient(leadId: string): Promise<{ clientId?: string; error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()

  // Buscar dados do lead
  const { data: lead } = await supabase
    .from('leads')
    .select('name, phone, city')
    .eq('id', leadId)
    .single()

  if (!lead) return { error: 'Lead não encontrado.' }

  // Criar cliente básico
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      organization_id: orgId,
      name: lead.name,
      phone: lead.phone,
      city: lead.city,
      lead_id: leadId,
      pipeline_stage: 'contratos',
    })
    .select('id')
    .single()

  if (clientError || !client) return { error: clientError?.message ?? 'Erro ao criar cliente.' }

  await logAction('Lead convertido em cliente', `Lead: ${leadId} → Cliente: ${client.id}`)

  // Marcar lead como convertido
  const { error: updateError } = await supabase.from('leads').update({
    converted: true,
    converted_to_client_id: client.id,
  }).eq('id', leadId)

  if (updateError) {
    // Rollback: excluir o cliente criado para evitar dado inconsistente
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: 'Erro ao marcar lead como convertido: ' + updateError.message }
  }

  revalidatePath('/leads')
  redirect(`/clientes/${client.id}`)
}

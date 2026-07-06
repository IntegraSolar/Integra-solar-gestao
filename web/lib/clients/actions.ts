// web/lib/clients/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from './types'

// ── Helpers ───────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

async function mergeCompletedTabs(
  clientId: string,
  supabase: any,
  update: Record<string, boolean>
): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('clients')
    .select('completed_tabs')
    .eq('id', clientId)
    .single()
  const current = ((data?.completed_tabs) ?? {}) as Record<string, boolean>
  return { ...current, ...update }
}

// ── Tab 1: Dados Pessoais ─────────────────────────────────────────

const tab1Schema = z.object({
  type: z.enum(['pf', 'pj']).default('pf'),
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf_cnpj: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  zip: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

export async function updateTab1(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const parsed = tab1Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      ...parsed.data,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab1: true }),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Dados pessoais salvos.' }
}

// ── Tab 2: Equipamentos Vendidos ──────────────────────────────────

export async function updateTab2(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const raw = Object.fromEntries(formData)
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      promised_kwh: raw.promised_kwh ? Number(raw.promised_kwh) : null,
      system_power_kwp: raw.system_power_kwp ? Number(raw.system_power_kwp) : null,
      panel_brand: (raw.panel_brand as string) || null,
      panel_power_w: raw.panel_power_w ? Number(raw.panel_power_w) : null,
      inverter_brand: (raw.inverter_brand as string) || null,
      inverter_power_w: raw.inverter_power_w ? Number(raw.inverter_power_w) : null,
      inverter_extra_capacity: (raw.inverter_extra_capacity as string) || null,
      specific_panels: raw.specific_panels === 'on',
      specific_inverter: raw.specific_inverter === 'on',
      direct_delivery: raw.direct_delivery === 'on',
      viability_proposal_id: (raw.viability_proposal_id as string) || null,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab2: true }),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Equipamentos salvos.' }
}

// ── Tab 3: Venda e Faturamento ────────────────────────────────────

const tab3Schema = z.object({
  sale_value: z.coerce.number().min(0, 'Valor da venda é obrigatório'),
  payment_method: z.string().optional(),
  nf_notes: z.string().optional(),
  commission_pct: z.coerce.number().min(0).max(100).default(0),
  commission_seller: z.string().optional(),
  proposal_id: z.string().optional(),
  installments_json: z.string().min(1, 'Parcelas são obrigatórias'),
})

export async function updateTab3(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const parsed = tab3Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let installments: Array<{ position: number; due_date: string; amount: number; notes?: string }>
  try {
    installments = JSON.parse(parsed.data.installments_json)
  } catch {
    return { error: 'Dados de parcelas inválidos.' }
  }
  if (installments.length === 0) return { error: 'Adicione pelo menos uma parcela.' }

  const supabase = await createClient()

  // Upsert client_sale
  const { data: existingSale } = await supabase
    .from('client_sale')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingSale) {
    await supabase.from('client_sale').update({
      sale_value: parsed.data.sale_value,
      payment_method: parsed.data.payment_method ?? null,
      nf_notes: parsed.data.nf_notes ?? null,
      commission_pct: parsed.data.commission_pct,
      commission_seller: parsed.data.commission_seller ?? null,
      proposal_id: parsed.data.proposal_id || null,
    }).eq('id', existingSale.id)
  } else {
    await supabase.from('client_sale').insert({
      client_id: clientId,
      organization_id: orgId,
      sale_value: parsed.data.sale_value,
      payment_method: parsed.data.payment_method ?? null,
      nf_notes: parsed.data.nf_notes ?? null,
      commission_pct: parsed.data.commission_pct,
      commission_seller: parsed.data.commission_seller ?? null,
      proposal_id: parsed.data.proposal_id || null,
    })
  }

  // Replace installments
  await supabase.from('client_installments').delete().eq('client_id', clientId)
  const { error: instError } = await supabase.from('client_installments').insert(
    installments.map((inst) => ({
      client_id: clientId,
      organization_id: orgId,
      position: inst.position,
      due_date: inst.due_date,
      amount: inst.amount,
      notes: inst.notes ?? null,
    }))
  )
  if (instError) return { error: instError.message }

  const { error } = await supabase
    .from('clients')
    .update({
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab3: true }),
    })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Venda e faturamento salvos.' }
}

// ── Tab 4: Vistoria ───────────────────────────────────────────────

export async function updateTab4(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const raw = Object.fromEntries(formData)
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      has_adaptation_works: raw.has_adaptation_works === 'on',
      adaptation_details: (raw.adaptation_details as string) || '[]',
      roof_type: (raw.roof_type as string) || null,
      roof_orientation: (raw.roof_orientation as string) || null,
      maps_coordinates: (raw.maps_coordinates as string) || null,
      entry_breaker: (raw.entry_breaker as string) || null,
      entry_cable_mm: (raw.entry_cable_mm as string) || null,
      inspection_done: raw.inspection_done === 'on',
      client_notes: (raw.client_notes as string) || null,
      extra_promises: (raw.extra_promises as string) || null,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab4: true }),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Vistoria salva.' }
}

// ── Tab 5: Prazos ─────────────────────────────────────────────────

export async function updateTab5(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const raw = Object.fromEntries(formData)
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      delivery_start_date: (raw.delivery_start_date as string) || null,
      contract_date: (raw.contract_date as string) || null,
      contract_max_days: raw.contract_max_days ? Number(raw.contract_max_days) : null,
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab5: true }),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Prazos salvos.' }
}

// ── Tab 6: Anexos (File Uploads) ──────────────────────────────────

export async function uploadAttachment(
  clientId: string,
  attachmentType: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${orgId}/${clientId}/${attachmentType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  // Armazenar URL segura (via API autenticada) em vez de URL pública do bucket
  const fileUrl = `/api/storage/download?bucket=client-files&path=${encodeURIComponent(path)}`

  const { data: existing } = await supabase
    .from('client_attachments')
    .select('id')
    .eq('client_id', clientId)
    .eq('type', attachmentType)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('client_attachments')
      .update({ file_url: fileUrl, uploaded_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('client_attachments').insert({
      client_id: clientId,
      organization_id: orgId,
      type: attachmentType,
      file_url: fileUrl,
    })
  }

  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Arquivo enviado.' }
}

export async function confirmTab6(clientId: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab6: true }),
    })
    .eq('id', clientId)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}`)
  return { success: 'Anexos confirmados.' }
}

// ── Tab 7: Contrato / Procuração ──────────────────────────────────

export async function uploadContractFile(
  clientId: string,
  field: 'contract' | 'procuracao',
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${orgId}/${clientId}/${field}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  // Armazenar URL segura (via API autenticada) em vez de URL pública do bucket
  const fileUrl = `/api/storage/download?bucket=client-files&path=${encodeURIComponent(path)}`
  const dbField = field === 'contract' ? 'contract_url' : 'power_of_attorney_url'

  const { data: existing } = await supabase
    .from('client_contracts')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('client_contracts')
      .update({ [dbField]: fileUrl } as any)
      .eq('id', existing.id)
  } else {
    await supabase.from('client_contracts').insert({
      client_id: clientId,
      organization_id: orgId,
      [dbField]: fileUrl,
    } as any)
  }

  // Contrato enviado = tab7 completa + avança pipeline para 'contratos'
  if (field === 'contract') {
    const { error } = await supabase
      .from('clients')
      .update({
        completed_tabs: await mergeCompletedTabs(clientId, supabase, { tab7: true }),
        pipeline_stage: 'contratos',
      })
      .eq('id', clientId)
    if (error) return { error: error.message }
  }

  revalidatePath(`/clientes/${clientId}`)
  return { success: field === 'contract' ? 'Contrato enviado.' : 'Procuração enviada.' }
}

// web/lib/simuladores/equipamentos/equipamentos-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import {
  painelSchema, inversorSchema, bateriaSchema,
  rowToPainel, painelToRow, rowToInversor, inversorToRow, rowToBateria, bateriaToRow,
  type PainelData, type InversorData, type BateriaData,
  type EquipPainel, type EquipInversor, type EquipBateria,
} from './schemas'

export type { EquipPainel, EquipInversor, EquipBateria, PainelData, InversorData, BateriaData } from './schemas'

const ROUTE = '/simuladores/hibrido-offgrid/equipamentos'
const MAX_POR_TIPO = 100

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

// ---------- PAINÉIS ----------
export async function listPaineis(): Promise<EquipPainel[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_equip_paineis')
    .select('id, fabricante, modelo, potencia_wp, voc, vmp, isc, imp, area_m2, coef_pmp, coef_voc, noct, eficiencia, peso_kg, garantia_anos')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToPainel(r as Record<string, unknown>))
}

export async function createPainel(data: PainelData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = painelSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_equip_paineis')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_POR_TIPO) return { error: `Máximo de ${MAX_POR_TIPO} painéis por empresa.` }
  const { error } = await supabase
    .from('simulador_equip_paineis')
    .insert({ organization_id: ctx.orgId, ...painelToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Painel cadastrado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Painel cadastrado.' }
}

export async function updatePainel(id: string, data: PainelData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = painelSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_paineis')
    .update(painelToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Painel atualizado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Painel atualizado.' }
}

export async function deletePainel(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_paineis')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Painel excluído', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Painel excluído.' }
}

// ---------- INVERSORES ----------
export async function listInversores(): Promise<EquipInversor[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_equip_inversores')
    .select('id, fabricante, modelo, tipo, pot_ca_nom_w, mppt_min_v, mppt_max_v, tensao_cc_max_v, num_mppt, corr_max_mppt_a, pot_fv_max_wp, pot_surge_w, tensao_cc_bat_v, eficiencia, backup, paralelismo')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToInversor(r as Record<string, unknown>))
}

export async function createInversor(data: InversorData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = inversorSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_equip_inversores')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_POR_TIPO) return { error: `Máximo de ${MAX_POR_TIPO} inversores por empresa.` }
  const { error } = await supabase
    .from('simulador_equip_inversores')
    .insert({ organization_id: ctx.orgId, ...inversorToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Inversor cadastrado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Inversor cadastrado.' }
}

export async function updateInversor(id: string, data: InversorData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = inversorSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_inversores')
    .update(inversorToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Inversor atualizado', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Inversor atualizado.' }
}

export async function deleteInversor(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_inversores')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Inversor excluído', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Inversor excluído.' }
}

// ---------- BATERIAS ----------
export async function listBaterias(): Promise<EquipBateria[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_equip_baterias')
    .select('id, fabricante, modelo, tecnologia, tensao_v, capacidade_ah, energia_kwh, corr_max_a, corr_recom_a, dod, soc_min, ciclos, eficiencia, garantia_anos')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToBateria(r as Record<string, unknown>))
}

export async function createBateria(data: BateriaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = bateriaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_equip_baterias')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_POR_TIPO) return { error: `Máximo de ${MAX_POR_TIPO} baterias por empresa.` }
  const { error } = await supabase
    .from('simulador_equip_baterias')
    .insert({ organization_id: ctx.orgId, ...bateriaToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Bateria cadastrada', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Bateria cadastrada.' }
}

export async function updateBateria(id: string, data: BateriaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = bateriaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_baterias')
    .update(bateriaToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Bateria atualizada', `${parsed.data.fabricante} ${parsed.data.modelo}`)
  revalidatePath(ROUTE)
  return { success: 'Bateria atualizada.' }
}

export async function deleteBateria(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_equip_baterias')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Bateria excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Bateria excluída.' }
}

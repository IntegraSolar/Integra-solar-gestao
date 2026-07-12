'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export const COST_CATEGORIES = [
  'Equipamentos',
  'Estrutura',
  'Cabos',
  'Conectores',
  'Proteções elétricas',
  'Frete',
  'Mão de obra',
  'Hospedagem',
  'Alimentação',
  'Combustível',
  'Locação de equipamentos',
  'Engenharia',
  'Documentação',
  'Taxas',
  'Comissão',
  'Outros',
] as const

export type CostCategory = (typeof COST_CATEGORIES)[number]

export type ProjectCost = {
  id: string
  client_id: string
  client_name: string
  description: string
  category: string
  amount: number
  cost_date: string
  notes: string | null
  created_at: string
}

export type UpsertCostData = {
  client_id: string
  description: string
  category: string
  amount: number
  cost_date: string
  notes?: string | null
}

export async function getProjectCosts(filters?: {
  clientId?: string
  category?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ProjectCost[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()
  let query = (supabase as any)
    .from('project_costs')
    .select('id, client_id, clients!client_id(name), description, category, amount, cost_date, notes, created_at')
    .eq('organization_id', orgId)
    .order('cost_date', { ascending: false })

  if (filters?.clientId) query = query.eq('client_id', filters.clientId)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.dateFrom) query = query.gte('cost_date', filters.dateFrom)
  if (filters?.dateTo) query = query.lte('cost_date', filters.dateTo)

  const { data } = await query
  return (data ?? []).map((r: any) => ({
    id: r.id,
    client_id: r.client_id,
    client_name: r.clients?.name ?? '—',
    description: r.description,
    category: r.category,
    amount: Number(r.amount),
    cost_date: r.cost_date,
    notes: r.notes ?? null,
    created_at: r.created_at,
  }))
}

export async function getCostsByClient(clientId: string): Promise<ProjectCost[]> {
  return getProjectCosts({ clientId })
}

export async function createCost(data: UpsertCostData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('project_costs')
    .insert({
      organization_id: orgId,
      client_id: data.client_id,
      description: data.description,
      category: data.category,
      amount: data.amount,
      cost_date: data.cost_date,
      notes: data.notes ?? null,
    })

  if (error) return { error: error.message }
  revalidatePath('/financeiro/custos')
  revalidatePath(`/financeiro/dre/${data.client_id}`)
  return { success: 'Custo registrado.' }
}

export async function updateCost(id: string, data: UpsertCostData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('project_costs')
    .update({
      description: data.description,
      category: data.category,
      amount: data.amount,
      cost_date: data.cost_date,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/financeiro/custos')
  revalidatePath(`/financeiro/dre/${data.client_id}`)
  return { success: 'Custo atualizado.' }
}

export async function deleteCost(id: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('project_costs')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/financeiro/custos')
  return { success: 'Custo removido.' }
}

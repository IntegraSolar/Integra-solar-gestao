// web/lib/simuladores/hibrido/simulacoes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import type { Json } from '@/types/database.types'
import {
  salvarSimulacaoSchema, salvarDataToRow, rowToResumo, rowToCompleta,
  type SalvarSimulacaoData, type SimulacaoResumo, type SimulacaoCompleta,
} from './simulacoes-schemas'

export type { SimulacaoResumo, SimulacaoCompleta, SalvarSimulacaoData } from './simulacoes-schemas'

const ROUTE = '/simuladores/hibrido-offgrid'
const MAX_SIMULACOES = 200

// Sem `snapshot`: a listagem não carrega o estado inteiro de cada simulação.
const COLUNAS_RESUMO =
  'id, nome, cliente_nome, cliente_cidade, potencia_kwp, investimento_total, vpl, tir, payback_anos, created_at'

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

export async function listSimulacoesHibrido(): Promise<SimulacaoResumo[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .select(COLUNAS_RESUMO)
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((r) => rowToResumo(r as Record<string, unknown>))
}

/** Busca snapshot + identificação completa, para reabrir. */
export async function getSimulacaoHibrido(id: string): Promise<SimulacaoCompleta | null> {
  const ctx = await requireOrg()
  if ('error' in ctx) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .select('*')
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .maybeSingle()
  if (error || !data) return null
  return rowToCompleta(data as Record<string, unknown>)
}

export async function salvarSimulacaoHibrido(data: SalvarSimulacaoData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = salvarSimulacaoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_hibrido_simulacoes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_SIMULACOES) {
    return { error: `Máximo de ${MAX_SIMULACOES} simulações por empresa.` }
  }
  const row = salvarDataToRow(parsed.data)
  const { error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .insert({ organization_id: ctx.orgId, ...row, snapshot: row.snapshot as Json })
  if (error) return { error: error.message }
  await logAction('Simulação híbrida salva', parsed.data.nome)
  revalidatePath(ROUTE)
  return { success: 'Simulação salva.' }
}

export async function deleteSimulacaoHibrido(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_hibrido_simulacoes')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Simulação híbrida excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Simulação excluída.' }
}

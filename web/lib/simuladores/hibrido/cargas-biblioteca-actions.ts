// web/lib/simuladores/hibrido/cargas-biblioteca-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSimuladoresOrg } from '@/lib/simuladores/access'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import { CARGAS_BIBLIOTECA_SEED } from './cargas-biblioteca-seed'
import {
  cargaBibliotecaSchema, rowToCargaBiblioteca, cargaBibliotecaToRow,
  type CargaBibliotecaData, type CargaBiblioteca,
} from './cargas-biblioteca-schemas'

export type { CargaBiblioteca, CargaBibliotecaData } from './cargas-biblioteca-schemas'

const ROUTE = '/simuladores/hibrido-offgrid/cargas'
const MAX_CARGAS = 200
const COLUNAS =
  'id, nome, categoria, potencia_unit_w, potencia_partida_w, tensao_v, fator_potencia, horas_dia, dias_semana, hora_inicio, hora_fim, prioridade, critica'

// Guard compartilhado: valida a org E o plano de Simuladores da empresa.
const requireOrg = requireSimuladoresOrg

export async function listCargasBiblioteca(): Promise<CargaBiblioteca[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_cargas_biblioteca')
    .select(COLUNAS)
    .eq('organization_id', ctx.orgId)
    .order('nome', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToCargaBiblioteca(r as Record<string, unknown>))
}

export async function createCargaBiblioteca(data: CargaBibliotecaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = cargaBibliotecaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_cargas_biblioteca')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_CARGAS) return { error: `Máximo de ${MAX_CARGAS} cargas por empresa.` }
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .insert({ organization_id: ctx.orgId, ...cargaBibliotecaToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Carga adicionada à biblioteca', parsed.data.nome)
  revalidatePath(ROUTE)
  return { success: 'Carga adicionada.' }
}

export async function updateCargaBiblioteca(id: string, data: CargaBibliotecaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = cargaBibliotecaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .update(cargaBibliotecaToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Carga da biblioteca atualizada', parsed.data.nome)
  revalidatePath(ROUTE)
  return { success: 'Carga atualizada.' }
}

export async function deleteCargaBiblioteca(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Carga da biblioteca excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Carga excluída.' }
}

/**
 * Popula a biblioteca padrão para a empresa. Idempotente: upsert por
 * (organization_id, nome) com ignoreDuplicates, então só insere o que falta.
 *
 * SEM revalidatePath: esta função é chamada durante o render da página, e
 * revalidar durante o render lança erro no Next (mesmo caso já corrigido em
 * seedConcessionarias).
 */
export async function seedCargasBiblioteca(): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const rows = CARGAS_BIBLIOTECA_SEED.map((c) => ({
    organization_id: ctx.orgId,
    ...cargaBibliotecaToRow(c),
  }))
  const { error } = await supabase
    .from('simulador_cargas_biblioteca')
    .upsert(rows, { onConflict: 'organization_id,nome', ignoreDuplicates: true })
  if (error) return { error: error.message }
  await logAction('Biblioteca de cargas padrão carregada', `${rows.length} cargas`)
  return { success: 'Biblioteca padrão carregada.' }
}

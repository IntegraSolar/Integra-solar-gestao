// web/lib/simuladores/viabilidade/concessionarias-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import {
  concessionariaBrutaSchema,
  type ConcessionariaBruta,
} from './concessionaria'
import { CONCESSIONARIAS_SEED } from './concessionarias-seed'

const ROUTE = '/simuladores/viabilidade-usina/concessionarias'

// Linha do banco (snake_case) com id.
export type ConcessionariaRow = ConcessionariaBruta & { id: string }

// Mapeia coluna do banco -> tipo bruto (camelCase).
function rowToBruta(r: Record<string, unknown>): ConcessionariaRow {
  return {
    id: String(r.id),
    nome: String(r.nome),
    tipoProcesso: String(r.tipo_processo),
    tusd: Number(r.tusd), te: Number(r.te),
    tusdFioB: Number(r.tusd_fio_b), tusdFioA: Number(r.tusd_fio_a),
    tusdPeD: Number(r.tusd_ped), tusdTfsee: Number(r.tusd_tfsee),
    icms: Number(r.icms), pisCofins: Number(r.pis_cofins),
    demandaContratadaSemImp: Number(r.demanda_contratada_sem_imp),
    demandaGeracaoSemImp: Number(r.demanda_geracao_sem_imp),
    aplicaReajuste1430: Boolean(r.aplica_reajuste_1430),
  }
}

// Converte tipo bruto (camelCase) -> colunas do banco (snake_case).
function brutaToRow(b: ConcessionariaBruta) {
  return {
    nome: b.nome, tipo_processo: b.tipoProcesso,
    tusd: b.tusd, te: b.te,
    tusd_fio_b: b.tusdFioB, tusd_fio_a: b.tusdFioA,
    tusd_ped: b.tusdPeD, tusd_tfsee: b.tusdTfsee,
    icms: b.icms, pis_cofins: b.pisCofins,
    demanda_contratada_sem_imp: b.demandaContratadaSemImp,
    demanda_geracao_sem_imp: b.demandaGeracaoSemImp,
    aplica_reajuste_1430: b.aplicaReajuste1430,
  }
}

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

export async function listConcessionarias(): Promise<ConcessionariaRow[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_concessionarias')
    .select('*')
    .eq('organization_id', ctx.orgId)
    .order('nome', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToBruta(r as Record<string, unknown>))
}

export async function createConcessionaria(data: ConcessionariaBruta): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = concessionariaBrutaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_concessionarias')
    .insert({ organization_id: ctx.orgId, ...brutaToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Concessionária criada', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Concessionária criada.' }
}

export async function updateConcessionaria(id: string, data: ConcessionariaBruta): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = concessionariaBrutaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  // Escopo de org explícito (defesa em profundidade além da RLS).
  const { error } = await supabase
    .from('simulador_concessionarias')
    .update(brutaToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Concessionária atualizada', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Concessionária atualizada.' }
}

export async function deleteConcessionaria(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_concessionarias')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Concessionária excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Concessionária excluída.' }
}

// Popula as concessionárias-padrão para a empresa. Idempotente: usa upsert por
// (organization_id, nome) com ignoreDuplicates para só inserir as que faltam.
export async function seedConcessionarias(): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const rows = CONCESSIONARIAS_SEED.map((b) => ({ organization_id: ctx.orgId, ...brutaToRow(b) }))
  const { error } = await supabase
    .from('simulador_concessionarias')
    .upsert(rows, { onConflict: 'organization_id,nome', ignoreDuplicates: true })
  if (error) return { error: error.message }
  await logAction('Concessionárias padrão carregadas', `${rows.length} concessionárias`)
  revalidatePath(ROUTE)
  return { success: 'Concessionárias padrão carregadas.' }
}

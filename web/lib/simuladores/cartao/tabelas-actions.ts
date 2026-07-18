// web/lib/simuladores/cartao/tabelas-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import type { Json } from '@/types/database.types'

const ROUTE = '/simuladores/parcelamento-cartao'
const MAX_TABELAS = 3

export type CartaoTabela = {
  id: string
  nome: string
  maxParcelas: number
  observacao: string | null
  taxas: Record<string, number>
  ordem: number
}

const tabelaSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à tabela.'),
  maxParcelas: z.coerce.number().int().min(1).max(24, 'Máximo de 24 parcelas.'),
  observacao: z.string().nullish(),
  taxas: z.record(z.string(), z.coerce.number().min(0, 'Taxa não pode ser negativa.')),
  ordem: z.coerce.number().int().min(0).default(0),
})
export type CartaoTabelaData = z.infer<typeof tabelaSchema>

async function requireOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  return { orgId }
}

function rowToTabela(r: Record<string, unknown>): CartaoTabela {
  return {
    id: String(r.id),
    nome: String(r.nome),
    maxParcelas: Number(r.max_parcelas),
    observacao: r.observacao ? String(r.observacao) : null,
    taxas: (r.taxas ?? {}) as Record<string, number>,
    ordem: Number(r.ordem),
  }
}

function dataToRow(d: CartaoTabelaData) {
  return {
    nome: d.nome,
    max_parcelas: d.maxParcelas,
    observacao: d.observacao ?? null,
    taxas: d.taxas as Json,
    ordem: d.ordem,
  }
}

export async function listCartaoTabelas(): Promise<CartaoTabela[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_cartao_tabelas')
    .select('id, nome, max_parcelas, observacao, taxas, ordem')
    .eq('organization_id', ctx.orgId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => rowToTabela(r as Record<string, unknown>))
}

export async function createCartaoTabela(data: CartaoTabelaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = tabelaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { count } = await supabase
    .from('simulador_cartao_tabelas')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
  if ((count ?? 0) >= MAX_TABELAS) return { error: `Máximo de ${MAX_TABELAS} tabelas por empresa.` }
  const { error } = await supabase
    .from('simulador_cartao_tabelas')
    .insert({ organization_id: ctx.orgId, ...dataToRow(parsed.data) })
  if (error) return { error: error.message }
  await logAction('Tabela de cartão criada', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Tabela criada.' }
}

export async function updateCartaoTabela(id: string, data: CartaoTabelaData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = tabelaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cartao_tabelas')
    .update(dataToRow(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Tabela de cartão atualizada', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Tabela atualizada.' }
}

export async function deleteCartaoTabela(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_cartao_tabelas')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Tabela de cartão excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Tabela excluída.' }
}

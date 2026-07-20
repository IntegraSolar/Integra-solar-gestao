// web/lib/simuladores/viabilidade/simulacoes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSimuladoresOrg } from '@/lib/simuladores/access'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import type { Json } from '@/types/database.types'

const ROUTE = '/simuladores/viabilidade-usina'

export type SimulacaoResumo = {
  id: string
  nome: string
  tir: number
  vpl: number
  paybackAnos: number
  input: unknown
  concessionariaId: string | null
  clienteNome: string | null
  clienteCidade: string | null
  createdAt: string
}

const salvarSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à simulação.'),
  concessionariaId: z.string().uuid().nullable(),
  clienteNome: z.string().nullish(),
  clienteCidade: z.string().nullish(),
  tir: z.coerce.number(),
  vpl: z.coerce.number(),
  paybackAnos: z.coerce.number().int(),
  input: z.record(z.string(), z.unknown()),
})
export type SalvarSimulacaoData = z.infer<typeof salvarSchema>

// Guard compartilhado: valida a org E o plano de Simuladores da empresa.
const requireOrg = requireSimuladoresOrg

export async function salvarSimulacao(data: SalvarSimulacaoData): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const parsed = salvarSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.from('simulador_viabilidade').insert({
    organization_id: ctx.orgId,
    nome: parsed.data.nome,
    concessionaria_id: parsed.data.concessionariaId,
    input: parsed.data.input as Json,
    cliente_nome: parsed.data.clienteNome ?? null,
    cliente_cidade: parsed.data.clienteCidade ?? null,
    tir: parsed.data.tir,
    vpl: parsed.data.vpl,
    payback_anos: parsed.data.paybackAnos,
  })
  if (error) return { error: error.message }
  await logAction('Simulação de viabilidade salva', `Nome: ${parsed.data.nome}`)
  revalidatePath(ROUTE)
  return { success: 'Simulação salva.' }
}

export async function listSimulacoes(): Promise<SimulacaoResumo[]> {
  const ctx = await requireOrg()
  if ('error' in ctx) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('simulador_viabilidade')
    .select('id, nome, tir, vpl, payback_anos, input, concessionaria_id, cliente_nome, cliente_cidade, created_at')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      nome: String(row.nome),
      tir: Number(row.tir),
      vpl: Number(row.vpl),
      paybackAnos: Number(row.payback_anos),
      input: row.input,
      concessionariaId: row.concessionaria_id ? String(row.concessionaria_id) : null,
      clienteNome: row.cliente_nome ? String(row.cliente_nome) : null,
      clienteCidade: row.cliente_cidade ? String(row.cliente_cidade) : null,
      createdAt: String(row.created_at),
    }
  })
}

export async function deleteSimulacao(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()
  const { error } = await supabase
    .from('simulador_viabilidade')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (error) return { error: error.message }
  await logAction('Simulação de viabilidade excluída', `ID: ${id}`)
  revalidatePath(ROUTE)
  return { success: 'Simulação excluída.' }
}

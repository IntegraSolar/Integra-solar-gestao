// web/lib/simuladores/viabilidade/simulacoes-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSimuladoresOrg } from '@/lib/simuladores/access'
import type { ActionResult } from '@/lib/crm/types'
import { logAction } from '@/lib/auditoria/actions'
import type { Json } from '@/types/database.types'
import { calcularViabilidade } from './engine'
import type { ViabilidadeInput } from './types'

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
  modeloPainel: string | null
  modeloInversor: string | null
  apresentacaoToken: string | null
  createdAt: string
}

const salvarSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à simulação.'),
  concessionariaId: z.string().uuid().nullable(),
  clienteNome: z.string().nullish(),
  clienteCidade: z.string().nullish(),
  modeloPainel: z.string().nullish(),
  modeloInversor: z.string().nullish(),
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
  const { error } = await (supabase as any).from('simulador_viabilidade').insert({
    organization_id: ctx.orgId,
    nome: parsed.data.nome,
    concessionaria_id: parsed.data.concessionariaId,
    input: parsed.data.input as Json,
    cliente_nome: parsed.data.clienteNome ?? null,
    cliente_cidade: parsed.data.clienteCidade ?? null,
    modelo_painel: parsed.data.modeloPainel ?? null,
    modelo_inversor: parsed.data.modeloInversor ?? null,
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
  const { data, error } = await (supabase as any)
    .from('simulador_viabilidade')
    .select('id, nome, tir, vpl, payback_anos, input, concessionaria_id, cliente_nome, cliente_cidade, modelo_painel, modelo_inversor, apresentacao_token, created_at')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as unknown[]).map((r) => {
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
      modeloPainel: row.modelo_painel ? String(row.modelo_painel) : null,
      modeloInversor: row.modelo_inversor ? String(row.modelo_inversor) : null,
      apresentacaoToken: row.apresentacao_token ? String(row.apresentacao_token) : null,
      createdAt: String(row.created_at),
    }
  })
}

/**
 * Devolve o link da proposta comercial da simulação salva. Preguiçoso: gera a
 * apresentação a partir do input na primeira vez e guarda o token na linha da
 * simulação; nas próximas, reabre o mesmo link (sem propostas duplicadas).
 */
export async function abrirPropostaDaSimulacao(
  id: string
): Promise<ActionResult & { token?: string }> {
  const ctx = await requireOrg()
  if ('error' in ctx) return ctx
  const supabase = await createClient()

  const { data: sim } = await (supabase as any)
    .from('simulador_viabilidade')
    .select('input, concessionaria_id, cliente_nome, cliente_cidade, modelo_painel, modelo_inversor, apresentacao_token')
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .maybeSingle()
  if (!sim) return { error: 'Simulação não encontrada.' }
  if (sim.apresentacao_token) return { success: 'Proposta pronta.', token: sim.apresentacao_token }

  const input = sim.input as ViabilidadeInput
  const resultado = calcularViabilidade(input)

  // Nome da concessionária no momento da geração (a proposta guarda o texto, não o id).
  let concessionariaNome = '—'
  if (sim.concessionaria_id) {
    const { data: conc } = await (supabase as any)
      .from('simulador_concessionarias')
      .select('nome')
      .eq('id', sim.concessionaria_id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()
    if (conc?.nome) concessionariaNome = String(conc.nome)
  }

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const { error: insErr } = await (supabase as any)
    .from('simulador_viabilidade_apresentacoes')
    .insert({
      organization_id: ctx.orgId,
      token,
      cliente_nome: sim.cliente_nome ?? null,
      cliente_cidade: sim.cliente_cidade ?? null,
      concessionaria_nome: concessionariaNome,
      modelo_painel: sim.modelo_painel ?? null,
      modelo_inversor: sim.modelo_inversor ?? null,
      input: input as unknown as Json,
      resultado: resultado as unknown as Json,
    })
  if (insErr) return { error: 'Erro ao gerar proposta: ' + insErr.message }

  const { error: updErr } = await (supabase as any)
    .from('simulador_viabilidade')
    .update({ apresentacao_token: token })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
  if (updErr) return { error: 'Proposta gerada, mas não vinculada: ' + updErr.message }

  revalidatePath(ROUTE)
  return { success: 'Proposta gerada.', token }
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

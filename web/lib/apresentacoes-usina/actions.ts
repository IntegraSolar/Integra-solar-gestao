// web/lib/apresentacoes-usina/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { requireSimuladoresOrg } from '@/lib/simuladores/access'
import type { ViabilidadeInput, ViabilidadeResultado } from '@/lib/simuladores/viabilidade/types'
import type { ActionResult } from '@/lib/crm/types'

export async function gerarPropostaUsina(payload: {
  input: ViabilidadeInput
  resultado: ViabilidadeResultado
  clienteNome: string | null
  clienteCidade: string | null
  concessionariaNome: string
  modeloPainel: string
  modeloInversor: string
}): Promise<ActionResult & { token?: string }> {
  const ctx = await requireSimuladoresOrg()
  if ('error' in ctx) return ctx

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('simulador_viabilidade_apresentacoes')
    .insert({
      organization_id: ctx.orgId,
      token,
      cliente_nome: payload.clienteNome,
      cliente_cidade: payload.clienteCidade,
      concessionaria_nome: payload.concessionariaNome,
      modelo_painel: payload.modeloPainel || null,
      modelo_inversor: payload.modeloInversor || null,
      input: payload.input,
      resultado: payload.resultado,
    })
  if (error) return { error: 'Erro ao gerar proposta: ' + error.message }
  return { success: 'Proposta gerada.', token }
}

// web/lib/configuracoes/actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

const str = z.string().max(500).optional().nullable()
const num = z.number().finite().optional().nullable()

// Whitelist explícita dos campos permitidos — impede mass assignment
const orgConfigSchema = z.object({
  // Dados da empresa
  razao_social: str, nome_fantasia: str, cnpj: str,
  email: z.string().email().max(200).optional().nullable(),
  telefone: str, cep: str, endereco: str, bairro: str,
  numero: str, cidade: str, estado: str, concessionaria: str,
  // Cálculo
  kwh_por_kwp: num, valor_projeto_por_kwp: num,
  valor_instalacao_por_placa: num, pct_material_ca: num,
  quilometragem: num, pct_comissao: num,
  pct_imposto: num, pct_margem: num,
  // Banco
  banco: str, agencia: str, conta: str, tipo_chave_pix: str, pix: str,
  // Meta
  meta_anual: num,
  prazo_padrao_contrato: z.number().int().min(1).max(3650).optional().nullable(),
})

export async function saveOrgConfig(formData: Record<string, unknown>): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = orgConfigSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('org_config')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  const payload = { ...parsed.data, organization_id: orgId }

  let error: any
  if (existing) {
    ;({ error } = await supabase.from('org_config').update(payload).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('org_config').insert(payload))
  }

  if (error) return { error: error.message }
  await logAction('Configurações da empresa salvas', '')
  revalidatePath('/configuracoes')
  return { success: 'Configurações salvas.' }
}

export async function addLeadOrigin(name: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!name.trim()) return { error: 'Nome obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lead_sources')
    .insert({ organization_id: orgId, name: name.trim() })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Origem adicionada.' }
}

export async function removeLeadOrigin(id: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lead_sources')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Origem removida.' }
}

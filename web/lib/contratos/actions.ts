// web/lib/contratos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'

export type ActionResult = { error?: string; success?: string }

export type ContractStatus = 'aguardando_assinatura' | 'assinado' | 'distratado'

export async function updateContractStatus(
  clientId: string,
  status: ContractStatus
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  // C1: valida o status em runtime (o tipo TS não impede um valor arbitrário).
  if (!['aguardando_assinatura', 'assinado', 'distratado'].includes(status)) {
    return { error: 'Status de contrato inválido.' }
  }

  const supabase = await createClient()

  // Busca o contrato existente
  const { data: existing } = await supabase
    .from('client_contracts')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existing) return { error: 'Contrato não encontrado.' }

  const contractUpdate: Record<string, unknown> = {
    status,
  }
  if (status === 'assinado') {
    contractUpdate.signed = true
    contractUpdate.signed_at = new Date().toISOString()
  }

  const { error: contractError } = await supabase
    .from('client_contracts')
    .update(contractUpdate as any)
    .eq('id', existing.id)

  if (contractError) return { error: contractError.message }

  // Avança pipeline se assinado
  if (status === 'assinado') {
    const { error: clientError } = await supabase
      .from('clients')
      .update({ pipeline_stage: 'financeiro' })
      .eq('id', clientId)
      .eq('organization_id', orgId)
    if (clientError) return { error: clientError.message }
  }

  await logAction('Contrato atualizado', `Cliente ID: ${clientId} → status: ${status}`)
  revalidatePath('/contratos')
  revalidatePath(`/contratos/${clientId}`)
  return { success: status === 'assinado' ? 'Contrato confirmado. Cliente avançado para Financeiro.' : 'Status atualizado.' }
}

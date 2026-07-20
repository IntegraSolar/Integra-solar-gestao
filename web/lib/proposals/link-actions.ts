// web/lib/proposals/link-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export async function getProposalLink(proposalId: string): Promise<{ token: string } | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('proposal_links')
    .select('token')
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

export async function generateProposalLink(
  proposalId: string
): Promise<ActionResult & { token?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Invalida o link anterior: um link ativo por proposta.
  await (supabase as any)
    .from('proposal_links')
    .update({ active: false })
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  const { error } = await (supabase as any)
    .from('proposal_links')
    .insert({ proposal_id: proposalId, organization_id: orgId, token })

  if (error) return { error: 'Erro ao gerar link: ' + error.message }

  // Configuração padrão da apresentação. onConflict evita duplicar quando o
  // link é regerado para a mesma proposta. Falha aqui não pode impedir a
  // geração do link: sem configuração, normalizarConfig aplica os padrões.
  try {
    await (supabase as any)
      .from('proposal_presentations')
      .upsert(
        { proposal_id: proposalId, organization_id: orgId },
        { onConflict: 'proposal_id' }
      )
  } catch {
    // Ignorado de propósito — ver comentário acima.
  }

  revalidatePath('/leads')
  return { success: 'Link gerado.', token }
}

export async function revokeProposalLink(proposalId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('proposal_links')
    .update({ active: false })
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)

  if (error) return { error: 'Erro ao revogar link: ' + error.message }

  revalidatePath('/leads')
  return { success: 'Link revogado.' }
}

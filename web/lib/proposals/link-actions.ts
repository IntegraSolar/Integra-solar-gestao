// web/lib/proposals/link-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'
import { normalizarConfig, type ApresentacaoConfig } from '@/lib/apresentacoes/tipos'

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

/**
 * Busca a config de apresentação salva para a proposta. Retorna `null` se não
 * houver config salva OU se a tabela `proposal_presentations` ainda não
 * existir (feature nova, pode não ter migration aplicada em todo ambiente).
 */
export async function getPresentationConfig(
  proposalId: string
): Promise<ApresentacaoConfig | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()

  try {
    const { data } = await (supabase as any)
      .from('proposal_presentations')
      .select('template, tema, blocos')
      .eq('proposal_id', proposalId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!data) return null
    return normalizarConfig(data)
  } catch {
    return null
  }
}

/**
 * Salva a config de apresentação escolhida pelo usuário no CRM. A entrada é
 * sempre normalizada antes de gravar — nunca confiamos no que vem do cliente.
 */
export async function savePresentationConfig(
  proposalId: string,
  config: { template?: unknown; tema?: unknown; blocos?: unknown }
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const normalizada = normalizarConfig(config)

  const supabase = await createClient()

  try {
    const { error } = await (supabase as any)
      .from('proposal_presentations')
      .upsert(
        {
          proposal_id: proposalId,
          organization_id: orgId,
          template: normalizada.template,
          tema: normalizada.tema,
          blocos: normalizada.blocos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'proposal_id' }
      )

    if (error) return { error: 'Erro ao salvar configuração: ' + error.message }
  } catch (e: any) {
    return { error: 'Erro ao salvar configuração: ' + (e?.message ?? 'tabela indisponível') }
  }

  revalidatePath('/leads')
  return { success: 'Configuração salva.' }
}

export async function generateProposalLink(
  proposalId: string,
  config?: { template?: unknown; tema?: unknown; blocos?: unknown }
): Promise<ActionResult & { token?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Reaproveita o link ativo em vez de criar outro. Regerar invalidaria o
  // endereço que o cliente possivelmente já recebeu, e ele veria "link inválido"
  // sem ninguém entender o motivo. Para trocar o link de propósito existe
  // regenerateProposalLink().
  const { data: existente } = await (supabase as any)
    .from('proposal_links')
    .select('token')
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  if (existente?.token && !config) {
    return { success: 'Link já existente.', token: existente.token }
  }

  // Com configuração nova, o link é refeito para que o destinatário não receba
  // uma apresentação diferente da que foi revisada.
  if (existente?.token) {
    await (supabase as any)
      .from('proposal_links')
      .update({ active: false })
      .eq('proposal_id', proposalId)
      .eq('organization_id', orgId)
  }

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  const { error } = await (supabase as any)
    .from('proposal_links')
    .insert({ proposal_id: proposalId, organization_id: orgId, token })

  if (error) return { error: 'Erro ao gerar link: ' + error.message }

  // Configuração da apresentação: usa a config recebida (normalizada) ou,
  // na ausência dela, mantém o comportamento atual (padrões aplicados por
  // normalizarConfig quando a página lê o registro vazio). onConflict evita
  // duplicar quando o link é regerado para a mesma proposta. Falha aqui não
  // pode impedir a geração do link: sem configuração, normalizarConfig
  // aplica os padrões.
  try {
    // Sem config da proposta, herda o padrão da empresa (Configurações →
    // Apresentação). Gravar só os ids deixaria o DEFAULT da coluna ('premium')
    // vencer o modelo que a empresa escolheu como padrão.
    let base = config
    if (!base) {
      try {
        const { data } = await (supabase as any)
          .from('org_apresentacao_config')
          .select('template, tema, blocos')
          .eq('organization_id', orgId)
          .maybeSingle()
        base = data ?? undefined
      } catch {
        base = undefined
      }
    }

    const upsertData = base
      ? (() => {
          const normalizada = normalizarConfig(base)
          return {
            proposal_id: proposalId,
            organization_id: orgId,
            template: normalizada.template,
            tema: normalizada.tema,
            blocos: normalizada.blocos,
            updated_at: new Date().toISOString(),
          }
        })()
      : { proposal_id: proposalId, organization_id: orgId }

    await (supabase as any)
      .from('proposal_presentations')
      .upsert(upsertData, { onConflict: 'proposal_id' })
  } catch {
    // Ignorado de propósito — ver comentário acima.
  }

  revalidatePath('/leads')
  return { success: 'Link gerado.', token }
}

/**
 * Invalida o link atual e emite outro. Uso deliberado — o endereço anterior
 * para de funcionar imediatamente, inclusive para quem já o recebeu.
 */
export async function regenerateProposalLink(
  proposalId: string
): Promise<ActionResult & { token?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  await (supabase as any)
    .from('proposal_links')
    .update({ active: false })
    .eq('proposal_id', proposalId)
    .eq('organization_id', orgId)

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const { error } = await (supabase as any)
    .from('proposal_links')
    .insert({ proposal_id: proposalId, organization_id: orgId, token })

  if (error) return { error: 'Erro ao gerar novo link: ' + error.message }

  revalidatePath('/leads')
  return { success: 'Novo link gerado.', token }
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

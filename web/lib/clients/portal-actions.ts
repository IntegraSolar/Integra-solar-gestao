'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

/** Erro típico de coluna ainda inexistente (migration não aplicada). */
function colunaAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return /PGRST204|column .* does not exist|could not find/i.test(
    `${error.code ?? ''} ${error.message ?? ''}`
  )
}

/** Seções do portal que podem ser ocultadas por link. */
export type PortalVisibility = {
  show_progress: boolean
  show_history: boolean
}

export async function getClientPortalLink(
  clientId: string
): Promise<({ token: string } & PortalVisibility) | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()
  // select('*') em vez das colunas nominais: se a migration de visibilidade ainda
  // não tiver sido aplicada, o link continua funcionando com o padrão.
  const { data } = await (supabase as any)
    .from('client_portal_links')
    .select('*')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  if (!data) return null
  return {
    token: data.token,
    show_progress: data.show_progress ?? true,
    show_history: data.show_history ?? true,
  }
}

export async function generateClientPortalLink(
  clientId: string,
  visibility: PortalVisibility = { show_progress: true, show_history: true }
): Promise<ActionResult & { token?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  await (supabase as any)
    .from('client_portal_links')
    .update({ active: false })
    .eq('client_id', clientId)
    .eq('organization_id', orgId)

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  const base = { client_id: clientId, organization_id: orgId, token }

  let { error } = await (supabase as any)
    .from('client_portal_links')
    .insert({
      ...base,
      show_progress: visibility.show_progress,
      show_history: visibility.show_history,
    })

  // Janela entre o deploy e a migration de visibilidade: gera o link mesmo assim,
  // com todas as seções visíveis (o default das colunas).
  if (colunaAusente(error)) {
    ;({ error } = await (supabase as any).from('client_portal_links').insert(base))
  }

  if (error) return { error: 'Erro ao gerar link: ' + error.message }

  revalidatePath('/clientes')
  return { success: 'Link gerado.', token }
}

/** Ajusta as seções visíveis de um link já criado, sem invalidá-lo. */
export async function updateClientPortalVisibility(
  clientId: string,
  visibility: PortalVisibility
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('client_portal_links')
    .update({
      show_progress: visibility.show_progress,
      show_history: visibility.show_history,
    })
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .eq('active', true)

  if (colunaAusente(error)) {
    return { error: 'Recurso indisponível: a migration de visibilidade do portal ainda não foi aplicada.' }
  }
  if (error) return { error: 'Erro ao salvar preferências: ' + error.message }

  revalidatePath('/clientes')
  return { success: 'Preferências salvas.' }
}

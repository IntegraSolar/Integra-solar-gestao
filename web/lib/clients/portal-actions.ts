'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export async function getClientPortalLink(
  clientId: string
): Promise<{ token: string } | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('client_portal_links')
    .select('token')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

export async function generateClientPortalLink(
  clientId: string
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

  const { error } = await (supabase as any)
    .from('client_portal_links')
    .insert({
      client_id: clientId,
      organization_id: orgId,
      token,
    })

  if (error) return { error: 'Erro ao gerar link: ' + error.message }

  revalidatePath('/clientes')
  return { success: 'Link gerado.', token }
}

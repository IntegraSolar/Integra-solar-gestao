// web/lib/configuracoes/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export async function saveOrgConfig(formData: Record<string, unknown>): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('org_config')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  const payload = { ...formData, organization_id: orgId, updated_at: new Date().toISOString() }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any).from('org_config').update(payload).eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any).from('org_config').insert(payload))
  }

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Configurações salvas.' }
}

export async function addLeadOrigin(name: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!name.trim()) return { error: 'Nome obrigatório.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('lead_sources')
    .insert({ organization_id: orgId, name: name.trim() })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Origem adicionada.' }
}

export async function removeLeadOrigin(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('lead_sources').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Origem removida.' }
}

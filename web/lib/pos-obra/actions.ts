'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertPosObraData = {
  data_contato?: string | null
  nps?: number | null
  observacoes?: string | null
  status: string
}

export async function upsertPosObra(
  clientId: string,
  data: UpsertPosObraData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('client_pos_obra')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const posObraData = {
    client_id: clientId,
    organization_id: orgId,
    data_contato: data.data_contato ?? null,
    nps: data.nps ?? null,
    observacoes: data.observacoes ?? null,
    status: data.status,
  }

  let error: any
  if (existing) {
    ;({ error } = await supabase
      .from('client_pos_obra')
      .update(posObraData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await supabase
      .from('client_pos_obra')
      .insert(posObraData))
  }

  if (error) return { error: error.message }

  const { data: client } = await supabase
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, pos_obra: data.status }

  await supabase
    .from('clients')
    .update({ pipeline_flags: newFlags })
    .eq('id', clientId)

  revalidatePath('/pos-obra')
  return { success: 'Pós-obra salva.' }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertObraData = {
  data_inicio?: string | null
  data_prevista?: string | null
  status: string
  responsavel_id?: string | null
  equipe_nome?: string | null
}

export async function upsertObra(
  clientId: string,
  data: UpsertObraData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('client_obras')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const obraData = {
    client_id: clientId,
    organization_id: orgId,
    data_inicio: data.data_inicio ?? null,
    data_prevista: data.data_prevista ?? null,
    status: data.status,
    responsavel_id: data.responsavel_id ?? null,
    equipe_nome: data.equipe_nome ?? null,
  }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any)
      .from('client_obras')
      .update(obraData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any)
      .from('client_obras')
      .insert(obraData))
  }

  if (error) return { error: error.message }

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, obra: data.status }

  newFlags.entrega_obra = 'pendente'

  const { data: existingObraDelivery } = await (supabase as any)
    .from('client_obra_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existingObraDelivery) {
    const { error: insertErr } = await (supabase as any).from('client_obra_deliveries').insert({
      client_id: clientId,
      organization_id: orgId,
      status: 'pendente',
      checklist: { vistoria: false, fotos: false, cliente_ok: false },
    })
    if (insertErr) return { error: insertErr.message }
  }

  await (supabase as any)
    .from('clients')
    .update({ pipeline_flags: newFlags })
    .eq('id', clientId)

  revalidatePath('/obra')
  return { success: 'Obra salva.' }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertObraDeliveryData = {
  data_entrega?: string | null
  observacoes?: string | null
  checklist: {
    vistoria: boolean
    fotos: boolean
    cliente_ok: boolean
    monitoramento_configurado: boolean
    sistema_ligado: boolean
  }
  status: string
  monitor_app?: string | null
  monitor_user?: string | null
  monitor_pass?: string | null
}

export async function upsertObraDelivery(
  clientId: string,
  data: UpsertObraDeliveryData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('client_obra_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const deliveryData = {
    client_id: clientId,
    organization_id: orgId,
    data_entrega: data.data_entrega ?? null,
    observacoes: data.observacoes ?? null,
    checklist: data.checklist,
    status: data.status,
    monitor_app: data.monitor_app ?? null,
    monitor_user: data.monitor_user ?? null,
    monitor_pass: data.monitor_pass ?? null,
    updated_at: new Date().toISOString(),
  }

  let error: any
  if (existing) {
    ;({ error } = await (supabase as any)
      .from('client_obra_deliveries')
      .update(deliveryData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await (supabase as any)
      .from('client_obra_deliveries')
      .insert(deliveryData))
  }

  if (error) return { error: error.message }

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, entrega_obra: data.status }

  newFlags.pos_obra = 'pendente'

  const { data: existingPosObra } = await (supabase as any)
    .from('client_pos_obra')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existingPosObra) {
    const { error: insertErr } = await (supabase as any).from('client_pos_obra').insert({
      client_id: clientId,
      organization_id: orgId,
      status: 'pendente',
    })
    if (insertErr) return { error: insertErr.message }
  }

  await (supabase as any)
    .from('clients')
    .update({ pipeline_flags: newFlags, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  revalidatePath('/entrega-obra')
  return { success: 'Entrega da obra salva.' }
}

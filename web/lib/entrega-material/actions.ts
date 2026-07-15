'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

// C1: valida status e data de entrega antes de gravar.
const deliverySchema = z.object({
  data_entrega: z.string().refine((d) => !d || !Number.isNaN(new Date(d).getTime()), 'Data de entrega inválida.').nullish(),
  status: z.string().min(1, 'Status é obrigatório.'),
})

type UpsertDeliveryData = {
  data_entrega?: string | null
  checklist: {
    foto_materiais: boolean
    verificar_avarias: boolean
  }
  status: string
}

export async function upsertDelivery(
  clientId: string,
  data: UpsertDeliveryData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = deliverySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('client_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const deliveryData = {
    client_id: clientId,
    organization_id: orgId,
    data_entrega: data.data_entrega ?? null,
    checklist: data.checklist,
    status: data.status,
  }

  let error: any
  if (existing) {
    ;({ error } = await supabase
      .from('client_deliveries')
      .update(deliveryData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await supabase
      .from('client_deliveries')
      .insert(deliveryData))
  }

  if (error) return { error: error.message }

  const { data: client } = await supabase
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, entrega_material: data.status }

  if (!currentFlags.obra) {
    newFlags.obra = 'pendente'

    const { data: existingObra } = await supabase
      .from('client_obras')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!existingObra) {
      await supabase.from('client_obras').insert({
        client_id: clientId,
        organization_id: orgId,
        status: 'aguardando',
      })
    }
  }

  await supabase
    .from('clients')
    .update({ pipeline_flags: newFlags })
    .eq('id', clientId)

  revalidatePath('/entrega-material')
  return { success: 'Entrega salva.' }
}

export async function uploadDeliveryMedia(
  clientId: string,
  formData: FormData
): Promise<ActionResult & { url?: string; fileName?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const timestamp = Date.now()
  const filePath = `entrega-material/${orgId}/${clientId}/${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(filePath, file, { upsert: false })

  if (uploadError) return { error: 'Erro ao enviar: ' + uploadError.message }

  const url = `/api/storage/download?bucket=client-files&path=${encodeURIComponent(filePath)}`

  // Append to media_urls JSON array
  const { data: delivery } = await supabase
    .from('client_deliveries')
    .select('media_urls')
    .eq('client_id', clientId)
    .maybeSingle()

  const currentUrls: string[] = (() => {
    try { return JSON.parse(delivery?.media_urls ?? '[]') } catch { return [] }
  })()

  currentUrls.push(url)

  await supabase
    .from('client_deliveries')
    .update({ media_urls: JSON.stringify(currentUrls) })
    .eq('client_id', clientId)

  revalidatePath(`/entrega-material/${clientId}`)
  return { success: 'Arquivo anexado.', url, fileName: file.name }
}

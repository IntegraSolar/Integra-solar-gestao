'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

// C1: valida status e data de entrega da obra antes de gravar.
const obraDeliverySchema = z.object({
  data_entrega: z.string().refine((d) => !d || !Number.isNaN(new Date(d).getTime()), 'Data de entrega inválida.').nullish(),
  status: z.string().min(1, 'Status é obrigatório.'),
})

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

  const parsed = obraDeliverySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: existing } = await supabase
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
  }

  let error: any
  if (existing) {
    ;({ error } = await supabase
      .from('client_obra_deliveries')
      .update(deliveryData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await supabase
      .from('client_obra_deliveries')
      .insert(deliveryData))
  }

  if (error) return { error: error.message }

  const { data: client } = await supabase
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, entrega_obra: data.status }

  newFlags.pos_obra = 'pendente'

  const { data: existingPosObra } = await supabase
    .from('client_pos_obra')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existingPosObra) {
    const { error: insertErr } = await supabase.from('client_pos_obra').insert({
      client_id: clientId,
      organization_id: orgId,
      status: 'pendente',
    })
    if (insertErr) return { error: insertErr.message }
  }

  await supabase
    .from('clients')
    .update({ pipeline_flags: newFlags })
    .eq('id', clientId)

  revalidatePath('/entrega-obra')
  return { success: 'Entrega da obra salva.' }
}

export type ObraPhoto = {
  id: string
  file_name: string
  file_path: string
  uploaded_at: string
}

export async function getObraPhotos(
  obraDeliveryId: string
): Promise<ObraPhoto[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('obra_photos')
    .select('id, file_name, file_path, uploaded_at')
    .eq('obra_delivery_id', obraDeliveryId)
    .order('uploaded_at', { ascending: true })
  return (data ?? []) as ObraPhoto[]
}

export async function uploadObraPhoto(
  obraDeliveryId: string,
  formData: FormData
): Promise<ActionResult & { photo?: ObraPhoto }> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione uma imagem.' }

  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { count } = await (supabase as any)
    .from('obra_photos')
    .select('id', { count: 'exact', head: true })
    .eq('obra_delivery_id', obraDeliveryId)

  if ((count ?? 0) >= 20) return { error: 'Limite de 20 fotos atingido.' }

  const uniqueId = crypto.randomUUID().slice(0, 8)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `obra-fotos/${obraDeliveryId}/${uniqueId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('project-docs')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) return { error: 'Erro ao enviar: ' + uploadError.message }

  const { data: row, error: insertError } = await (supabase as any)
    .from('obra_photos')
    .insert({
      obra_delivery_id: obraDeliveryId,
      organization_id: orgId,
      file_name: file.name,
      file_path: storagePath,
    })
    .select('id, file_name, file_path, uploaded_at')
    .single()

  if (insertError) return { error: 'Erro ao registrar foto: ' + insertError.message }

  revalidatePath('/entrega-obra')
  return { success: 'Foto enviada.', photo: row as ObraPhoto }
}

export async function deleteObraPhoto(
  photoId: string
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: photo } = await (supabase as any)
    .from('obra_photos')
    .select('file_path')
    .eq('id', photoId)
    .eq('organization_id', orgId)
    .single()

  if (!photo) return { error: 'Foto não encontrada.' }

  await supabase.storage.from('project-docs').remove([photo.file_path])

  const { error } = await (supabase as any)
    .from('obra_photos')
    .delete()
    .eq('id', photoId)

  if (error) return { error: 'Erro ao remover: ' + error.message }

  revalidatePath('/entrega-obra')
  return { success: 'Foto removida.' }
}

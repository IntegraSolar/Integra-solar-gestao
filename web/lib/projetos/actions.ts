// web/lib/projetos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertProjectData = {
  responsavel_id?: string | null
  numero_processo?: string | null
  data_protocolo?: string | null
  prazo_protocolo?: string | null
  data_solicitacao_vistoria?: string | null
  prazo_vistoria?: string | null
  status: string
  checklist: {
    memorial_calculo: boolean
    art: boolean
    homologacao: boolean
  }
}

export async function upsertProject(
  clientId: string,
  data: UpsertProjectData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Check if record exists
  const { data: existing } = await supabase
    .from('client_projects')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const projectData = {
    client_id: clientId,
    organization_id: orgId,
    responsavel_nome: data.responsavel_id ?? null,
    numero_processo: data.numero_processo ?? null,
    data_protocolo: data.data_protocolo ?? null,
    prazo_protocolo: data.prazo_protocolo ?? null,
    data_solicitacao_vistoria: data.data_solicitacao_vistoria ?? null,
    prazo_vistoria: data.prazo_vistoria ?? null,
    status: data.status,
    checklist: data.checklist,
  }

  let error: any
  if (existing) {
    ;({ error } = await supabase
      .from('client_projects')
      .update(projectData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await supabase
      .from('client_projects')
      .insert(projectData))
  }

  if (error) return { error: error.message }

  // Update pipeline_flags
  const { data: client } = await supabase
    .from('clients')
    .select('pipeline_flags')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}

  await supabase
    .from('clients')
    .update({
      pipeline_flags: {
        ...currentFlags,
        projetos: data.status,
      },
    })
    .eq('id', clientId)

  revalidatePath('/projetos')
  return { success: 'Projeto salvo.' }
}

export async function uploadProjectDoc(
  clientId: string,
  docType: 'art' | 'projeto' | 'parecer_acesso',
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const filePath = `${clientId}/${docType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('project-docs')
    .upload(filePath, file, { upsert: true })

  if (uploadError) return { error: 'Erro ao enviar: ' + uploadError.message }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const url = `${supabaseUrl}/storage/v1/object/public/project-docs/${filePath}`

  await supabase
    .from('client_projects')
    .update({ [`${docType}_url`]: url } as any)
    .eq('client_id', clientId)

  revalidatePath(`/projetos/${clientId}`)
  return { success: 'Documento anexado.', url }
}

export type ProjectAttachment = {
  id: string
  file_name: string
  file_path: string
  uploaded_at: string
}

export async function getProjectAttachments(
  projectId: string
): Promise<ProjectAttachment[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('project_attachments')
    .select('id, file_name, file_path, uploaded_at')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: true })

  return (data ?? []) as ProjectAttachment[]
}

export async function uploadProjectAttachment(
  projectId: string,
  formData: FormData
): Promise<ActionResult & { attachment?: ProjectAttachment }> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { count } = await (supabase as any)
    .from('project_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if ((count ?? 0) >= 10) return { error: 'Limite de 10 anexos atingido.' }

  const uniqueId = crypto.randomUUID().slice(0, 8)
  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${projectId}/${uniqueId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('project-docs')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) return { error: 'Erro ao enviar: ' + uploadError.message }

  const { data: row, error: insertError } = await (supabase as any)
    .from('project_attachments')
    .insert({
      project_id: projectId,
      organization_id: orgId,
      file_name: file.name,
      file_path: storagePath,
    })
    .select('id, file_name, file_path, uploaded_at')
    .single()

  if (insertError) return { error: 'Erro ao registrar anexo: ' + insertError.message }

  revalidatePath(`/projetos`)
  return { success: 'Anexo enviado.', attachment: row as ProjectAttachment }
}

export async function deleteProjectAttachment(
  attachmentId: string
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: att } = await (supabase as any)
    .from('project_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .eq('organization_id', orgId)
    .single()

  if (!att) return { error: 'Anexo não encontrado.' }

  await supabase.storage.from('project-docs').remove([att.file_path])

  const { error } = await (supabase as any)
    .from('project_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) return { error: 'Erro ao remover: ' + error.message }

  revalidatePath(`/projetos`)
  return { success: 'Anexo removido.' }
}

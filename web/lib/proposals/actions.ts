'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

type ActionResult = { error?: string; success?: string }

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

// ── Template Actions ───────────────────────────────────────────────

export async function uploadProposalTemplate(formData: FormData): Promise<ActionResult & { id?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const file = formData.get('file') as File | null
  const name = formData.get('name') as string
  const category = formData.get('category') as string

  if (!file || file.size === 0) return { error: 'Arquivo é obrigatório.' }
  if (!name?.trim()) return { error: 'Nome é obrigatório.' }
  if (!file.name.endsWith('.docx')) return { error: 'Apenas arquivos .docx são aceitos.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande. O limite para templates é 10 MB.' }

  const supabase = await createClient()
  const safeName = file.name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${orgId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('proposal-templates')
    .upload(filePath, file, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  if (uploadError) return { error: 'Erro ao enviar arquivo: ' + uploadError.message }

  const { data, error: insertError } = await supabase
    .from('proposal_templates')
    .insert({
      org_id: orgId,
      name: name.trim(),
      category: category?.trim() || null,
      file_path: filePath,
    })
    .select('id')
    .single()

  if (insertError) {
    await supabase.storage.from('proposal-templates').remove([filePath])
    return { error: 'Erro ao salvar template: ' + insertError.message }
  }

  revalidatePath('/configuracoes')
  return { success: 'Template enviado com sucesso.', id: data.id }
}

export async function updateProposalTemplate(
  id: string,
  updates: { name?: string; category?: string; is_default?: boolean; is_active?: boolean }
): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  if (updates.is_default === true) {
    await supabase
      .from('proposal_templates')
      .update({ is_default: false })
      .eq('org_id', orgId)
  }

  const { error } = await supabase
    .from('proposal_templates')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Template atualizado.' }
}

export async function deleteProposalTemplate(id: string): Promise<ActionResult> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa. Faça login novamente.' }

  const supabase = await createClient()

  const { data, error: selectError } = await supabase
    .from('proposal_templates')
    .select('file_path')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!data) return { error: selectError?.message ?? 'Template não encontrado.' }

  const { error: storageError } = await supabase.storage.from('proposal-templates').remove([data.file_path])
  if (storageError) {
    // Arquivo ausente no storage não impede a exclusão do registro no banco
    const { logger } = await import('@/lib/logger')
    logger.warn('proposals', 'Falha ao remover arquivo do storage', { templateId: id })
  }

  const { error } = await supabase
    .from('proposal_templates')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Template excluído.' }
}

// ── Proposta: salvar campos financeiros ───────────────────────────

export async function saveProposalFinancials(
  proposalId: string,
  data: {
    template_id: string
    preco_total: number
    custo_kit: number
    custo_projeto: number
    custo_instalacao: number
    custo_km: number
    custo_ca: number
    valor_entrada: number
    valor_parcelas: number
    num_parcelas: number
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('proposals')
    .update(data as any)
    .eq('id', proposalId)

  if (error) return { error: error.message }
  return { success: 'Dados salvos.' }
}

export async function saveProposalPdfUrl(
  proposalId: string,
  pdf_url: string,
  docx_url: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('proposals')
    .update({ pdf_url, docx_url, gerado_em: new Date().toISOString() } as any)
    .eq('id', proposalId)
  if (error) return { error: error.message }
  return { success: 'URL salva.' }
}

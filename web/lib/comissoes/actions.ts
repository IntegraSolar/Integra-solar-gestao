'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { requirePermission } from '@/lib/org/permissions'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

export async function markCommissionPaid(
  commissionId: string,
  comprovanteUrl?: string
): Promise<ActionResult> {
  try { await requirePermission('comissoes', 'edit') } catch { return { error: 'Sem permissão para marcar comissão como paga.' } }
  const supabase = await createClient()

  // Fetch commission to get client_id
  const { data: commission, error: fetchError } = await supabase
    .from('client_commissions')
    .select('id, client_id')
    .eq('id', commissionId)
    .single()

  if (fetchError || !commission) return { error: 'Comissão não encontrada.' }

  const { error } = await supabase
    .from('client_commissions')
    .update({
      status: 'paga',
      paid_at: new Date().toISOString(),
      comprovante_url: comprovanteUrl ?? null,
    })
    .eq('id', commissionId)

  if (error) return { error: error.message }

  // Update pipeline_flags.comissoes = 'paga'
  const { data: client } = await supabase
    .from('clients')
    .select('pipeline_flags')
    .eq('id', commission.client_id)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}

  await supabase
    .from('clients')
    .update({
      pipeline_flags: { ...currentFlags, comissoes: 'paga' },
    })
    .eq('id', commission.client_id)

  await logAction('Comissão paga', `Comissão ID: ${commissionId}`)
  revalidatePath('/comissoes')
  return { success: 'Comissão marcada como paga.' }
}

export async function uploadComprovanteComissao(
  commissionId: string,
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Não autenticado.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }

  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return { error: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande. Máximo 10 MB.' }

  const ext = file.name.split('.').pop() ?? 'pdf'
  const filePath = `${orgId}/comissoes/${commissionId}.${ext}`

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: 'Erro ao enviar arquivo: ' + uploadError.message }

  const url = `/api/storage/download?bucket=receipts&path=${encodeURIComponent(filePath)}`
  return { success: 'Arquivo enviado.', url }
}

// web/lib/financeiro/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { InstallmentStatus, PurchaseStatus, ProjectStatus, PipelineStage } from '@/lib/constants/status'

export type ActionResult = { error?: string; success?: string; payment_proof_url?: string }

export async function confirmInstallment(installmentId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Busca a parcela garantindo que pertence a um cliente da organização do usuário
  const { data: installment, error: fetchError } = await supabase
    .from('client_installments')
    .select('id, position, client_id, clients!inner(organization_id)')
    .eq('id', installmentId)
    .eq('clients.organization_id', orgId)
    .single()

  if (fetchError || !installment) return { error: 'Parcela não encontrada.' }

  // Confirm the installment
  const { error } = await supabase
    .from('client_installments')
    .update({ status: InstallmentStatus.CONFIRMADA, confirmed_at: new Date().toISOString() })
    .eq('id', installmentId)

  if (error) return { error: error.message }

  // If this is position 1 (entrada), activate Projetos and Compras
  if (installment.position === 1) {
    // Fetch client to get org_id and current flags
    const { data: client } = await supabase
      .from('clients')
      .select('pipeline_flags, organization_id')
      .eq('id', installment.client_id)
      .single()

    const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
    const orgId = client?.organization_id

    // Update pipeline_flags
    await supabase
      .from('clients')
      .update({
        pipeline_flags: {
          ...currentFlags,
          projetos: ProjectStatus.PENDENTE,
          compras: PurchaseStatus.AGUARDANDO,
        },
      })
      .eq('id', installment.client_id)

    // Create initial client_projects record if not exists
    const { data: existingProject } = await supabase
      .from('client_projects')
      .select('id')
      .eq('client_id', installment.client_id)
      .maybeSingle()

    if (!existingProject && orgId) {
      await supabase.from('client_projects').insert({
        client_id: installment.client_id,
        organization_id: orgId,
        status: ProjectStatus.PENDENTE,
        checklist: { memorial_calculo: false, art: false, homologacao: false },
      })
    }

    // Create initial client_purchases record if not exists
    const { data: existingPurchase } = await supabase
      .from('client_purchases')
      .select('id')
      .eq('client_id', installment.client_id)
      .maybeSingle()

    if (!existingPurchase && orgId) {
      await supabase.from('client_purchases').insert({
        client_id: installment.client_id,
        organization_id: orgId,
        status: PurchaseStatus.AGUARDANDO,
      })
    }
  }

  revalidatePath('/financeiro')
  return { success: 'Pagamento confirmado.' }
}

const ALLOWED_RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function uploadReceipt(installmentId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  // Validação de tipo e tamanho
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
    return { error: 'Tipo de arquivo não permitido. Use PDF, JPEG, PNG ou WebP.' }
  }
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return { error: 'Arquivo muito grande. O limite é 5 MB.' }
  }

  const supabase = await createClient()

  // Garante que a parcela pertence a um cliente da organização do usuário
  const { data: inst } = await supabase
    .from('client_installments')
    .select('client_id, clients!inner(organization_id)')
    .eq('id', installmentId)
    .eq('clients.organization_id', orgId)
    .single()

  if (!inst) return { error: 'Parcela não encontrada.' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const filePath = `${inst.client_id}/${installmentId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: 'Erro ao enviar: ' + uploadError.message }

  // Salvar como URL de acesso via API segura (gera signed URL no servidor)
  // O route /api/storage/download valida autenticação e org antes de redirecionar
  const secureUrl = `/api/storage/download?bucket=receipts&path=${encodeURIComponent(filePath)}`

  // Atualiza APENAS o URL do comprovante — nunca altera status.
  // O status só pode mudar via confirmInstallment(), que também dispara o pipeline.
  // Nota: o trigger auto_confirm_on_receipt no banco deve estar dropado (migration 20260706000002).
  const { error: updateError } = await supabase
    .from('client_installments')
    .update({ payment_proof_url: secureUrl } as any)
    .eq('id', installmentId)

  if (updateError) return { error: 'Erro ao salvar comprovante: ' + updateError.message }

  revalidatePath('/financeiro')
  revalidatePath(`/financeiro/${inst.client_id}`)
  return { success: 'Comprovante anexado.', payment_proof_url: secureUrl }
}

export async function advanceToProjects(clientId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ pipeline_stage: PipelineStage.PROJETOS })
    .eq('id', clientId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  revalidatePath(`/financeiro/${clientId}`)
  return { success: 'Cliente avançado para Projetos.' }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type UpsertPurchaseData = {
  fornecedor?: string | null
  itens?: string | null
  valor?: number | null
  data_prevista?: string | null
  status: string
  nf_url?: string | null
  comprovante_url?: string | null
}

export async function upsertPurchase(
  clientId: string,
  data: UpsertPurchaseData
): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  // Check if record exists
  const { data: existing } = await supabase
    .from('client_purchases')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  const purchaseData = {
    client_id: clientId,
    organization_id: orgId,
    fornecedor: data.fornecedor ?? null,
    itens: data.itens ?? null,
    valor: data.valor ?? null,
    data_prevista: data.data_prevista ?? null,
    status: data.status,
    nf_url: data.nf_url ?? null,
    comprovante_url: data.comprovante_url ?? null,
  }

  let error: any
  if (existing) {
    ;({ error } = await supabase
      .from('client_purchases')
      .update(purchaseData)
      .eq('id', existing.id))
  } else {
    ;({ error } = await supabase
      .from('client_purchases')
      .insert(purchaseData))
  }

  if (error) return { error: error.message }

  // Fetch current pipeline_flags
  const { data: client } = await supabase
    .from('clients')
    .select('pipeline_flags, lead_id')
    .eq('id', clientId)
    .single()

  const currentFlags = (client?.pipeline_flags as Record<string, string>) ?? {}
  const newFlags: Record<string, string> = { ...currentFlags, compras: data.status }

  // If confirmed: activate comissoes
  if (data.status === 'confirmado' && !currentFlags.comissoes) {
    newFlags.comissoes = 'pendente'

    // Find vendedor_id via lead
    let vendedorId: string | null = null
    if (client?.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to_user_id')
        .eq('id', client.lead_id)
        .maybeSingle()
      vendedorId = lead?.assigned_to_user_id ?? null
    }

    // Calcula a comissão a partir da venda (client_sale)
    let valorComissao = 0
    const { data: sale } = await (supabase as any)
      .from('client_sale')
      .select('sale_value, commission_pct')
      .eq('client_id', clientId)
      .maybeSingle()

    if (sale?.sale_value && sale?.commission_pct) {
      valorComissao = (sale.sale_value * sale.commission_pct) / 100
    }

    // Create commission record
    await supabase.from('client_commissions').insert({
      client_id: clientId,
      organization_id: orgId,
      vendedor_id: vendedorId,
      valor_comissao: valorComissao,
      status: 'pendente',
    })
  }

  // Activate entrega_material on save
  if (!currentFlags.entrega_material) {
    newFlags.entrega_material = 'pendente'

    const { data: existingDelivery } = await supabase
      .from('client_deliveries')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (!existingDelivery) {
      await supabase.from('client_deliveries').insert({
        client_id: clientId,
        organization_id: orgId,
        status: 'pendente',
        checklist: { limpeza: false, manuais: false, orientacao_uso: false },
      })
    }
  }

  await supabase
    .from('clients')
    .update({
      pipeline_flags: newFlags,
    })
    .eq('id', clientId)

  revalidatePath('/compras')
  return { success: 'Compra salva.' }
}

export async function uploadPurchaseDoc(
  clientId: string,
  docType: 'nf_equipamentos' | 'romaneio' | 'comprovante',
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const filePath = `${orgId}/${clientId}/${docType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('client-files')
    .upload(filePath, file, { upsert: true })

  if (uploadError) return { error: 'Erro ao enviar: ' + uploadError.message }

  const url = `/api/storage/download?bucket=client-files&path=${encodeURIComponent(filePath)}`

  await supabase
    .from('client_purchases')
    .update({ [`${docType}_url`]: url } as any)
    .eq('client_id', clientId)

  revalidatePath(`/compras/${clientId}`)
  return { success: 'Documento anexado.', url }
}

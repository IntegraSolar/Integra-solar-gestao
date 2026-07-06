'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/crm/types'

export async function markCommissionPaid(
  commissionId: string,
  comprovanteUrl?: string
): Promise<ActionResult> {
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

  revalidatePath('/comissoes')
  return { success: 'Comissão marcada como paga.' }
}

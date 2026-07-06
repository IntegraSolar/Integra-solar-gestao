'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

export async function createStockItem(data: {
  name: string
  quantity: number
  unit_value: number
  description: string | null
}): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any).from('stock_items').insert({
    organization_id: orgId,
    name: data.name,
    quantity: data.quantity,
    unit_value: data.unit_value,
    description: data.description ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/estoque')
  return { success: 'Item criado.' }
}

export async function updateStockItem(
  id: string,
  data: {
    name: string
    quantity: number
    unit_value: number
    description: string | null
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('stock_items')
    .update({
      name: data.name,
      quantity: data.quantity,
      unit_value: data.unit_value,
      description: data.description ?? null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/estoque')
  return { success: 'Item atualizado.' }
}

export async function deleteStockItem(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('stock_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/estoque')
  return { success: 'Item removido.' }
}

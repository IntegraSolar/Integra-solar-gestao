'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

// C1: valida os campos do item de estoque (nome, quantidade e valor não-negativos).
const stockSchema = z.object({
  name: z.string().min(1, 'Nome do item é obrigatório.'),
  quantity: z.coerce.number().nonnegative('Quantidade não pode ser negativa.'),
  unit_value: z.coerce.number().nonnegative('Valor unitário não pode ser negativo.'),
  description: z.string().nullish(),
})

export async function createStockItem(data: {
  name: string
  quantity: number
  unit_value: number
  description: string | null
}): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = stockSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('stock_items').insert({
    organization_id: orgId,
    name: data.name,
    quantity: data.quantity,
    unit_value: data.unit_value,
    description: data.description ?? null,
  })

  if (error) return { error: error.message }
  await logAction('Item de estoque criado', `Nome: ${data.name}`)
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
  // Isolamento de tenant: sem o escopo de org, um id arbitrário editaria
  // item de OUTRA empresa (dependia só da RLS — defesa em profundidade).
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const parsed = stockSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stock_items')
    .update({
      name: data.name,
      quantity: data.quantity,
      unit_value: data.unit_value,
      description: data.description ?? null,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  await logAction('Item de estoque atualizado', `ID: ${id}, Nome: ${data.name}`)
  revalidatePath('/estoque')
  return { success: 'Item atualizado.' }
}

export async function deleteStockItem(id: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stock_items')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) return { error: error.message }
  await logAction('Item de estoque excluído', `ID: ${id}`)
  revalidatePath('/estoque')
  return { success: 'Item removido.' }
}

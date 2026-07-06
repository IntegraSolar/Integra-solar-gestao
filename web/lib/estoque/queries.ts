// web/lib/estoque/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type StockItem = {
  id: string
  name: string
  quantity: number
  unit_value: number
  total_value: number
  description: string | null
}

export async function getStockItems(): Promise<StockItem[]> {
  const supabase = await createClient()
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const { data, error } = await supabase
    .from('stock_items')
    .select('id, name, quantity, unit_value, description')
    .eq('organization_id', orgId)
    .order('name')

  if (error || !data) return []

  return (data as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    quantity: Number(r.quantity),
    unit_value: Number(r.unit_value),
    total_value: Number(r.quantity) * Number(r.unit_value),
    description: r.description ?? null,
  }))
}

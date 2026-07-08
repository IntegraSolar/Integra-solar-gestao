import { createAdminClient } from '@/lib/supabase/admin'

export type AssinaturaRow = {
  id: string
  organization_id: string
  organization_name: string
  plan: string | null
  status: string | null
  billing_cycle: string | null
  amount: number | null
  payment_method: string | null
  provider: string | null
  started_at: string | null
  expires_at: string | null
  created_at: string
}

export async function listarAssinaturas(status?: string): Promise<AssinaturaRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('subscriptions')
    .select('id, organization_id, plan, status, billing_cycle, amount, payment_method, provider, started_at, expires_at, created_at')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error || !data) return []

  const orgIds = [...new Set(data.map((s) => s.organization_id))]
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name')
    .in('id', orgIds)

  const orgMap: Record<string, string> = {}
  for (const o of orgs ?? []) orgMap[o.id] = o.name

  return data.map((s) => ({
    ...s,
    organization_name: orgMap[s.organization_id] ?? '—',
  }))
}

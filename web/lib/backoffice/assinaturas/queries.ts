import { createAdminClient } from '@/lib/supabase/admin'

export type AssinaturaRow = {
  id: string
  name: string
  plan: string | null
  status: string | null
  amount: number | null
  created_at: string
  trial_ends_at: string | null
  blocked_at: string | null
}

export async function listarAssinaturas(status?: string): Promise<AssinaturaRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('organizations')
    .select('id, name, plan, status, amount, created_at, trial_ends_at, blocked_at')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    if (status === 'blocked') {
      query = query.not('blocked_at', 'is', null)
    } else {
      query = query.eq('status', status).is('blocked_at', null)
    }
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((o) => ({
    id: o.id,
    name: o.name,
    plan: o.plan,
    status: o.status,
    amount: o.amount,
    created_at: o.created_at,
    trial_ends_at: o.trial_ends_at,
    blocked_at: o.blocked_at,
  }))
}

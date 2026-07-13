import { createAdminClient } from '@/lib/supabase/admin'

// Valores monetários são inteiros em centavos.
export const PRECO_PADRAO = {
  amount: 30000,     // R$ 300,00 / mês
  setup_fee: 50000,  // R$ 500,00 implantação (única)
}

export type SubscriptionRow = {
  id: string
  organization_id: string
  plan: string
  billing_cycle: string
  payment_method: string
  provider: string
  status: string
  amount: number
  setup_fee: number | null
  started_at: string
  expires_at: string | null
}

export type AssinaturaRow = {
  id: string                 // organization id
  name: string
  status: string | null      // status da organização
  created_at: string
  trial_ends_at: string | null
  blocked_at: string | null
  subscription: SubscriptionRow | null
}

// Busca a assinatura mais recente de cada organização
async function subsMap(orgIds: string[]): Promise<Record<string, SubscriptionRow>> {
  if (!orgIds.length) return {}
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .in('organization_id', orgIds)
    .order('created_at', { ascending: false })

  const map: Record<string, SubscriptionRow> = {}
  for (const s of (data ?? []) as SubscriptionRow[]) {
    if (!map[s.organization_id]) map[s.organization_id] = s
  }
  return map
}

export async function listarAssinaturas(status?: string): Promise<AssinaturaRow[]> {
  const admin = createAdminClient()

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, status, created_at, trial_ends_at, blocked_at')
    .order('created_at', { ascending: false })

  if (!orgs) return []

  const map = await subsMap(orgs.map((o) => o.id))

  let rows: AssinaturaRow[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    status: o.status,
    created_at: o.created_at,
    trial_ends_at: o.trial_ends_at,
    blocked_at: o.blocked_at,
    subscription: map[o.id] ?? null,
  }))

  if (status && status !== 'all') {
    if (status === 'blocked') {
      rows = rows.filter((r) => !!r.blocked_at)
    } else if (status === 'sem_assinatura') {
      rows = rows.filter((r) => !r.subscription && !r.blocked_at)
    } else {
      rows = rows.filter((r) => r.subscription?.status === status && !r.blocked_at)
    }
  }

  return rows
}

// Assinatura de uma organização específica (para o painel de detalhe)
export async function getAssinatura(orgId: string): Promise<SubscriptionRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as SubscriptionRow) ?? null
}

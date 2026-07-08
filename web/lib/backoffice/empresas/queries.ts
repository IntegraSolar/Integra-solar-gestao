import { createAdminClient } from '@/lib/supabase/admin'

export type EmpresaRow = {
  id: string
  corporate_name: string
  fantasy_name: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  created_at: string
  blocked_at: string | null
  blocked_reason: string | null
  trial_ends_at: string | null
  assinatura: { plano: string | null; status: string | null; data_fim: string | null } | null
  total_users: number
}

export type EmpresaDetalhe = EmpresaRow & {
  logo_url: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  zip_code: string | null
  usuarios: Array<{ id: string; name: string; email: string; is_active: boolean; is_super_admin: boolean; created_at: string }>
}

export async function listarEmpresas(search?: string): Promise<EmpresaRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('organizations')
    .select('id, corporate_name, fantasy_name, cnpj, email, phone, city, state, created_at, blocked_at, blocked_reason, trial_ends_at')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `corporate_name.ilike.%${search}%,fantasy_name.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error || !data) return []

  const orgIds = data.map((o) => o.id)

  const [{ data: assinaturas }, { data: userCounts }] = await Promise.all([
    admin
      .from('assinaturas')
      .select('organization_id, plano, status, data_fim')
      .in('organization_id', orgIds),
    admin
      .from('app_users')
      .select('organization_id')
      .in('organization_id', orgIds),
  ])

  const assinaturaMap: Record<string, { plano: string | null; status: string | null; data_fim: string | null }> = {}
  for (const a of assinaturas ?? []) {
    if (!assinaturaMap[a.organization_id]) assinaturaMap[a.organization_id] = a
  }

  const countMap: Record<string, number> = {}
  for (const u of userCounts ?? []) {
    countMap[u.organization_id] = (countMap[u.organization_id] ?? 0) + 1
  }

  return data.map((o) => ({
    ...o,
    assinatura: assinaturaMap[o.id] ?? null,
    total_users: countMap[o.id] ?? 0,
  }))
}

export async function buscarEmpresa(id: string): Promise<EmpresaDetalhe | null> {
  const admin = createAdminClient()

  const [{ data: org }, { data: assinaturas }, { data: users }] = await Promise.all([
    admin
      .from('organizations')
      .select('id, corporate_name, fantasy_name, cnpj, email, phone, logo_url, street, number, complement, neighborhood, city, state, zip_code, created_at, blocked_at, blocked_reason, trial_ends_at')
      .eq('id', id)
      .single(),
    admin
      .from('assinaturas')
      .select('plano, status, data_fim')
      .eq('organization_id', id)
      .limit(1),
    admin
      .from('app_users')
      .select('id, name, email, is_active, is_super_admin, created_at')
      .eq('organization_id', id)
      .order('created_at'),
  ])

  if (!org) return null

  return {
    ...org,
    assinatura: assinaturas?.[0] ?? null,
    total_users: users?.length ?? 0,
    usuarios: users ?? [],
  }
}

export async function bloquearEmpresa(id: string, motivo: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ blocked_at: new Date().toISOString(), blocked_reason: motivo })
    .eq('id', id)
  return error ? { error: error.message } : {}
}

export async function desbloquearEmpresa(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ blocked_at: null, blocked_reason: null })
    .eq('id', id)
  return error ? { error: error.message } : {}
}

import { createAdminClient } from '@/lib/supabase/admin'

export type EmpresaRow = {
  id: string
  name: string
  plan: string | null
  status: string | null
  created_at: string
  blocked_at: string | null
  blocked_reason: string | null
  trial_ends_at: string | null
  assinatura: { plan: string | null; status: string | null; expires_at: string | null } | null
  total_users: number
}

export type EmpresaDetalhe = EmpresaRow & {
  usuarios: Array<{ id: string; full_name: string; email: string; role: string; created_at: string }>
}

export async function listarEmpresas(search?: string): Promise<EmpresaRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('organizations')
    .select('id, name, plan, status, created_at, blocked_at, blocked_reason, trial_ends_at')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error || !data) return []

  const orgIds = data.map((o) => o.id)

  const [{ data: subscriptions }, { data: memberCounts }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('organization_id, plan, status, expires_at')
      .in('organization_id', orgIds),
    admin
      .from('organization_members')
      .select('organization_id')
      .in('organization_id', orgIds),
  ])

  const subMap: Record<string, { plan: string | null; status: string | null; expires_at: string | null }> = {}
  for (const s of subscriptions ?? []) {
    if (!subMap[s.organization_id]) subMap[s.organization_id] = s
  }

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.organization_id] = (countMap[m.organization_id] ?? 0) + 1
  }

  return data.map((o) => ({
    ...o,
    assinatura: subMap[o.id] ?? null,
    total_users: countMap[o.id] ?? 0,
  }))
}

export async function buscarEmpresa(id: string): Promise<EmpresaDetalhe | null> {
  const admin = createAdminClient()

  const [{ data: org }, { data: subscriptions }, { data: members }] = await Promise.all([
    admin
      .from('organizations')
      .select('id, name, plan, status, created_at, blocked_at, blocked_reason, trial_ends_at')
      .eq('id', id)
      .single(),
    admin
      .from('subscriptions')
      .select('plan, status, expires_at')
      .eq('organization_id', id)
      .limit(1),
    admin
      .from('organization_members')
      .select('id, role, created_at, user_id')
      .eq('organization_id', id)
      .order('created_at'),
  ])

  if (!org) return null

  // Buscar profiles dos membros
  const userIds = (members ?? []).map((m) => m.user_id)
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const profileMap: Record<string, { full_name: string; email: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const usuarios = (members ?? []).map((m) => ({
    id: m.id,
    full_name: profileMap[m.user_id]?.full_name ?? '—',
    email: profileMap[m.user_id]?.email ?? '—',
    role: m.role ?? 'member',
    created_at: m.created_at,
  }))

  return {
    ...org,
    assinatura: subscriptions?.[0] ?? null,
    total_users: usuarios.length,
    usuarios,
  }
}

export async function editarEmpresa(
  id: string,
  data: { name?: string; plan?: string; status?: string }
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { error: error.message } : {}
}

export async function excluirEmpresa(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient()

  // Busca os user_ids desta org para remover do auth depois
  const { data: members } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', id)

  // Remove a organização (FK cascade remove registros filhos)
  const { error } = await admin.from('organizations').delete().eq('id', id)
  if (error) return { error: error.message }

  // Remove usuários do auth
  for (const m of members ?? []) {
    await admin.auth.admin.deleteUser(m.user_id).catch(() => null)
  }

  return {}
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

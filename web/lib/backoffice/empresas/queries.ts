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

  const [{ data: assinaturas }, { data: memberCounts }] = await Promise.all([
    admin
      .from('assinaturas')
      .select('organization_id, plano, status, data_fim')
      .in('organization_id', orgIds),
    admin
      .from('app_users' as any)
      .select('organization_id')
      .in('organization_id', orgIds),
  ])

  const subMap: Record<string, { plan: string | null; status: string | null; expires_at: string | null }> = {}
  for (const s of assinaturas ?? []) {
    if (!subMap[s.organization_id]) {
      subMap[s.organization_id] = { plan: s.plano, status: s.status, expires_at: s.data_fim }
    }
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

  const [{ data: org }, { data: assinaturas }, { data: members }] = await Promise.all([
    admin
      .from('organizations')
      .select('id, name, plan, status, created_at, blocked_at, blocked_reason, trial_ends_at')
      .eq('id', id)
      .single(),
    admin
      .from('assinaturas')
      .select('plano, status, data_fim')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
    admin
      .from('app_users' as any)
      .select('id, name, email, role_id, created_at')
      .eq('organization_id', id)
      .order('created_at'),
  ])

  if (!org) return null

  const usuarios = (members ?? []).map((m) => ({
    id: m.id,
    full_name: m.name ?? '—',
    email: m.email ?? '—',
    role: m.role_id ?? 'member',
    created_at: m.created_at,
  }))

  return {
    ...org,
    assinatura: assinaturas?.[0]
      ? { plan: assinaturas[0].plano, status: assinaturas[0].status, expires_at: assinaturas[0].data_fim }
      : null,
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

  // Busca todos os user_ids desta org para remover do auth depois
  const { data: members } = await admin
    .from('app_users')
    .select('id')
    .eq('organization_id', id)

  const userIds = (members ?? []).map((m) => m.id)

  // Remove membros da app_users primeiro (evita FK violations)
  if (userIds.length) {
    await admin.from('app_users' as any).delete().in('id', userIds)
  }

  // Remove a organização
  const { error } = await admin.from('organizations').delete().eq('id', id)
  if (error) return { error: error.message }

  // Remove usuários do auth
  for (const uid of userIds) {
    await admin.auth.admin.deleteUser(uid).catch(() => null)
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

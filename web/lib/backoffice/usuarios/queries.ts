import { createAdminClient } from '@/lib/supabase/admin'

export type UsuarioRow = {
  id: string
  user_id: string
  organization_id: string
  organization_name: string
  full_name: string
  email: string
  role: string | null
  created_at: string
}

export async function listarUsuarios(search?: string): Promise<UsuarioRow[]> {
  const admin = createAdminClient()

  const { data: members, error } = await admin
    .from('organization_members')
    .select('id, user_id, organization_id, role, created_at')
    .order('created_at', { ascending: false })

  if (error || !members) return []

  const userIds = [...new Set(members.map((m) => m.user_id))]
  const orgIds  = [...new Set(members.map((m) => m.organization_id))]

  const [{ data: profiles }, { data: orgs }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', userIds),
    admin.from('organizations').select('id, name').in('id', orgIds),
  ])

  const profileMap: Record<string, { full_name: string; email: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const orgMap: Record<string, string> = {}
  for (const o of orgs ?? []) orgMap[o.id] = o.name

  let rows: UsuarioRow[] = members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    organization_id: m.organization_id,
    organization_name: orgMap[m.organization_id] ?? '—',
    full_name: profileMap[m.user_id]?.full_name ?? '—',
    email: profileMap[m.user_id]?.email ?? '—',
    role: m.role,
    created_at: m.created_at,
  }))

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.organization_name.toLowerCase().includes(q)
    )
  }

  return rows
}

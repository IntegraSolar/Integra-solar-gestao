// web/lib/colaboradores/queries.ts
import { getCurrentUserData } from '@/lib/org/queries'
import { createAdminClient } from '@/lib/supabase/admin'

export type ModulePermission = {
  access: boolean
  view_all: boolean
  add: boolean
  edit: boolean
  delete: boolean
  export: boolean
}

export type Colaborador = {
  id: string
  user_id: string
  full_name: string | null
  email: string
  role: string
  permissions: Record<string, ModulePermission>
  created_at: string
}

export async function getColaboradores(): Promise<Colaborador[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const adminClient = createAdminClient()
  const { data } = await (adminClient as any)
    .from('organization_members')
    .select(`
      id,
      user_id,
      role,
      permissions,
      created_at,
      profiles!user_id (full_name, email)
    `)
    .eq('organization_id', orgId)
    .order('created_at')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? '',
    role: r.role,
    permissions: (r.permissions ?? {}) as Record<string, ModulePermission>,
    created_at: r.created_at,
  }))
}

import { createAdminClient } from '@/lib/supabase/admin'

export type AuditoriaRow = {
  id: string
  organization_id: string | null
  organization_name: string | null
  user_id: string | null
  user_name: string | null
  action: string
  description: string | null
  created_at: string
}

export async function listarAuditoria(limit = 100): Promise<AuditoriaRow[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('audit_logs')
    .select('id, organization_id, user_id, user_name, action, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  const orgIds = [...new Set(data.map((r) => r.organization_id).filter(Boolean))] as string[]
  const { data: orgs } = orgIds.length
    ? await admin.from('organizations').select('id, name').in('id', orgIds)
    : { data: [] }

  const orgMap: Record<string, string> = {}
  for (const o of orgs ?? []) orgMap[o.id] = o.name

  return data.map((r) => ({
    ...r,
    organization_name: r.organization_id ? (orgMap[r.organization_id] ?? null) : null,
  }))
}

export async function registrarAuditoria({
  organization_id,
  user_name,
  action,
  description,
}: {
  organization_id?: string
  user_name: string
  action: string
  description: string
}) {
  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    organization_id: organization_id ?? null,
    user_id: null,
    user_name,
    action,
    description,
  })
}

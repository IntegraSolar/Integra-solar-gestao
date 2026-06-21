// web/lib/auditoria/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type AuditLog = {
  id: string
  user_name: string | null
  action: string
  description: string | null
  created_at: string
}

export async function getAuditLogs(page = 1, pageSize = 20): Promise<{ logs: AuditLog[]; total: number }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { logs: [], total: 0 }

  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await (supabase as any)
    .from('audit_logs')
    .select('id, user_name, action, description, created_at', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { logs: [], total: 0 }
  return { logs: (data ?? []) as AuditLog[], total: count ?? 0 }
}

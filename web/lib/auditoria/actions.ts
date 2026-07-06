// web/lib/auditoria/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { AuditLog } from './queries'

export async function logAction(action: string, description: string): Promise<void> {
  try {
    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return

    const supabase = await createClient()
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      user_id: user.profile.id,
      user_name: user.profile.full_name ?? user.profile.email,
      action,
      description,
    })
  } catch {
    // audit failures must never crash the main flow
  }
}

export async function getAuditLogsPage(page: number): Promise<{ logs: AuditLog[]; total: number }> {
  const { getAuditLogs } = await import('./queries')
  return getAuditLogs(page, 20)
}

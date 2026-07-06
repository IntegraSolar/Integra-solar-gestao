'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ProposalTemplate } from '@/lib/crm/types'

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

export async function getProposalTemplates(): Promise<ProposalTemplate[]> {
  const orgId = await getOrgId()
  if (!orgId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProposalTemplate[]
}

export async function getActiveProposalTemplates(): Promise<ProposalTemplate[]> {
  const orgId = await getOrgId()
  if (!orgId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProposalTemplate[]
}

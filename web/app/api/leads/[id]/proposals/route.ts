import { NextResponse } from 'next/server'
import { getProposalsByLead, getSuppliers, getGenerationFactor } from '@/lib/crm/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { getActiveProposalTemplates } from '@/lib/proposals/templates'
import { getCurrentUserData } from '@/lib/org/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return NextResponse.json({ proposals: [], suppliers: [], generationFactor: 1, orgConfig: null, templates: [] })

  // Verificar que o lead pertence à organização
  const supabase = await createClient()
  const { data: lead } = await (supabase as any)
    .from('leads').select('id').eq('id', params.id).eq('organization_id', orgId).maybeSingle()
  if (!lead) return NextResponse.json({ proposals: [], suppliers: [], generationFactor: 1, orgConfig: null, templates: [] })

  const [proposals, suppliers, generationFactor, orgConfig, templates] = await Promise.all([
    getProposalsByLead(params.id),
    getSuppliers(),
    getGenerationFactor(),
    getOrgConfig(),
    getActiveProposalTemplates(),
  ])
  return NextResponse.json({ proposals, suppliers, generationFactor, orgConfig, templates })
}

import { NextResponse } from 'next/server'
import { getProposalsByLead, getSuppliers, getGenerationFactor } from '@/lib/crm/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { getActiveProposalTemplates } from '@/lib/proposals/templates'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return NextResponse.json({ proposals: [], suppliers: [], generationFactor: 1, orgConfig: null, templates: [] })

  const role = user?.membership?.role ?? ''
  const isAdmin = role === 'owner' || role === 'admin'
  const permissions = (user?.membership as any)?.permissions ?? {}
  const canSeePricing = isAdmin || permissions?.ver_precificacao?.access === true

  // RLS já garante que só retorna dados da org do usuário — sem query extra de verificação
  const [proposals, suppliers, generationFactor, orgConfig, templates] = await Promise.all([
    getProposalsByLead(id),
    getSuppliers(),
    getGenerationFactor(),
    getOrgConfig(orgId),
    getActiveProposalTemplates(),
  ])
  return NextResponse.json({ proposals, suppliers, generationFactor, orgConfig, templates, canSeePricing })
}

import { NextResponse } from 'next/server'
import { getProposalsByLead, getSuppliers, getGenerationFactor } from '@/lib/crm/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { getActiveProposalTemplates } from '@/lib/proposals/templates'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [proposals, suppliers, generationFactor, orgConfig, templates] = await Promise.all([
    getProposalsByLead(params.id),
    getSuppliers(),
    getGenerationFactor(),
    getOrgConfig(),
    getActiveProposalTemplates(),
  ])
  return NextResponse.json({ proposals, suppliers, generationFactor, orgConfig, templates })
}

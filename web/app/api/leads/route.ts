import { NextResponse } from 'next/server'
import { enforceRate, RATE_POLICIES } from '@/lib/security/rate-policies'
import { getLeads } from '@/lib/crm/queries'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET() {
  const user = await getCurrentUserData()
  if (!user?.membership?.organization.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const blocked = await enforceRate(`api:leads:${user.membership.organization.id}`, RATE_POLICIES.sensitiveApi)
  if (blocked) return blocked
  const leads = await getLeads()
  return NextResponse.json({ leads })
}

import { NextResponse } from 'next/server'
import { getLeads } from '@/lib/crm/queries'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET() {
  const user = await getCurrentUserData()
  if (!user?.membership?.organization.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const leads = await getLeads()
  return NextResponse.json({ leads })
}

import { getProjectCosts } from '@/lib/financeiro/costs-actions'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { redirect } from 'next/navigation'
import CustosClient from './CustosClient'

export default async function CustosPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')
  const orgId = user.membership.organization.id

  const supabase = await createClient()
  const { data: clientsRaw } = await (supabase as any)
    .from('clients')
    .select('id, name, city')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })

  const clients = (clientsRaw ?? []).map((c: any) => ({ id: c.id, name: c.name, city: c.city }))
  const costs = await getProjectCosts()

  return <CustosClient costs={costs} clients={clients} />
}

// web/app/(dashboard)/clientes/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getClients } from '@/lib/clients/queries'
import { redirect } from 'next/navigation'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const clients = await getClients()

  return <ClientesClient clients={clients} />
}

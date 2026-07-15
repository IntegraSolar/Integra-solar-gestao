export const metadata = { title: "Contratos" }
import { getCurrentUserData } from '@/lib/org/queries'
import { getContratos } from '@/lib/contratos/queries'
import { redirect } from 'next/navigation'
import ContratosClient from './ContratosClient'

export default async function ContratosPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const clients = await getContratos()

  return <ContratosClient clients={clients} />
}

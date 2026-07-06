// web/app/(dashboard)/clientes/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getClients, CLIENTS_PAGE_SIZE } from '@/lib/clients/queries'
import { redirect } from 'next/navigation'
import ClientesClient from './ClientesClient'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Math.max(0, parseInt(searchParams.page ?? '0', 10) || 0)

  // Autenticação e dados em paralelo — ambos usam a sessão internamente
  const [user, { clients, total }] = await Promise.all([
    getCurrentUserData(),
    getClients(page),
  ])

  if (!user?.membership) redirect('/login')

  return <ClientesClient clients={clients} total={total} page={page} pageSize={CLIENTS_PAGE_SIZE} />
}

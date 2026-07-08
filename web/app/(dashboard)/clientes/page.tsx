// web/app/(dashboard)/clientes/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getClients, getClientsFilterOptions, CLIENTS_PAGE_SIZE, type ClientsFilters } from '@/lib/clients/queries'
import { redirect } from 'next/navigation'
import ClientesClient from './ClientesClient'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    city?: string
    kwpMin?: string
    kwpMax?: string
    inverterBrand?: string
    panelBrand?: string
    inverterPowerMin?: string
    inverterPowerMax?: string
    origem?: string
    paymentMethod?: string
  }>
}) {
  const sp = await searchParams
  const page = Math.max(0, parseInt(sp.page ?? '0', 10) || 0)

  const filters: ClientsFilters = {
    city: sp.city || undefined,
    kwpMin: sp.kwpMin ? Number(sp.kwpMin) : undefined,
    kwpMax: sp.kwpMax ? Number(sp.kwpMax) : undefined,
    inverterBrand: sp.inverterBrand || undefined,
    panelBrand: sp.panelBrand || undefined,
    inverterPowerMin: sp.inverterPowerMin ? Number(sp.inverterPowerMin) : undefined,
    inverterPowerMax: sp.inverterPowerMax ? Number(sp.inverterPowerMax) : undefined,
    origemId: sp.origem || undefined,
    paymentMethod: sp.paymentMethod || undefined,
  }

  const [user, { clients, total }, filterOptions] = await Promise.all([
    getCurrentUserData(),
    getClients(page, filters),
    getClientsFilterOptions(),
  ])

  if (!user?.membership) redirect('/login')

  return (
    <ClientesClient
      clients={clients}
      total={total}
      page={page}
      pageSize={CLIENTS_PAGE_SIZE}
      filterOptions={filterOptions}
      filters={filters}
    />
  )
}

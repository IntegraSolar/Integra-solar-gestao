export const metadata = { title: "Comissões" }
// web/app/(dashboard)/comissoes/page.tsx
import { requireModuleAccess } from '@/lib/org/permissions'
import { getComissoesPainel, getComissoesMembers } from '@/lib/comissoes/queries'
import ComissoesPainelClient from './ComissoesPainelClient'

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; vendedorId?: string; dateField?: string }>
}) {
  await requireModuleAccess('comissoes')

  const params = await searchParams
  const now = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year = parseInt(params.year ?? String(now.getFullYear()))
  const vendedorId = params.vendedorId ?? ''
  const dateField = (params.dateField === 'paid_at' ? 'paid_at' : 'created_at') as 'created_at' | 'paid_at'

  const [painel, members] = await Promise.all([
    getComissoesPainel({ month, year, vendedorId: vendedorId || undefined, dateField }),
    getComissoesMembers(),
  ])

  return (
    <ComissoesPainelClient
      painel={painel}
      members={members}
      month={month}
      year={year}
      vendedorId={vendedorId}
      dateField={dateField}
    />
  )
}

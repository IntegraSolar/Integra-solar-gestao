// web/app/(dashboard)/comissoes/page.tsx
import { getComissoesPainel, getComissoesMembers } from '@/lib/comissoes/queries'
import ComissoesPainelClient from './ComissoesPainelClient'

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; vendedorId?: string }
}) {
  const now = new Date()
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const vendedorId = searchParams.vendedorId ?? ''

  const [painel, members] = await Promise.all([
    getComissoesPainel({ month, year, vendedorId: vendedorId || undefined }),
    getComissoesMembers(),
  ])

  return (
    <ComissoesPainelClient
      painel={painel}
      members={members}
      month={month}
      year={year}
      vendedorId={vendedorId}
    />
  )
}

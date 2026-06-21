// web/app/(dashboard)/financeiro/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getFinanceiroPainel, getFinanceiroMembers } from '@/lib/financeiro/queries'
import { redirect } from 'next/navigation'
import { FinanceiroPainelClient } from './FinanceiroPainelClient'

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; vendedor?: string }
}) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const now = new Date()
  const month = Number(searchParams.month ?? now.getMonth() + 1)
  const year = Number(searchParams.year ?? now.getFullYear())
  const vendedorId = searchParams.vendedor || undefined

  const [painel, members] = await Promise.all([
    getFinanceiroPainel({ month, year, vendedorId }),
    getFinanceiroMembers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            Financeiro
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
            Painel de parcelas
          </p>
        </div>
      </div>
      <FinanceiroPainelClient
        painel={painel}
        members={members}
        month={month}
        year={year}
        vendedorId={vendedorId ?? ''}
      />
    </div>
  )
}

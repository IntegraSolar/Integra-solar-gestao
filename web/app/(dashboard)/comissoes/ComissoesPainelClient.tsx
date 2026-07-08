// web/app/(dashboard)/comissoes/ComissoesPainelClient.tsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { ComissoesPainel, ComissaoMember } from '@/lib/comissoes/queries'
import { formatCurrency } from '@/lib/format'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'
import { MonthYearFilter } from '@/components/ui/filters/MonthYearFilter'
import { SelectFilter } from '@/components/ui/filters/SelectFilter'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    paga: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { pendente: 'Pendente', paga: 'Paga' }
  const cls = map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function ComissoesPainelClient({
  painel,
  members,
  month,
  year,
  vendedorId,
  dateField,
}: {
  painel: ComissoesPainel
  members: ComissaoMember[]
  month: number
  year: number
  vendedorId: string
  dateField: 'created_at' | 'paid_at'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const filteredItems = filterBySearch(painel.items, search, ['client_name'])

  function applyFilter(patch: { month?: number; year?: number; vendedorId?: string; dateField?: 'created_at' | 'paid_at' }) {
    const sp = new URLSearchParams()
    sp.set('month', String(patch.month ?? month))
    sp.set('year', String(patch.year ?? year))
    const nv = patch.vendedorId !== undefined ? patch.vendedorId : vendedorId
    if (nv) sp.set('vendedorId', nv)
    const nd = patch.dateField ?? dateField
    if (nd !== 'created_at') sp.set('dateField', nd)
    router.push(`${pathname}?${sp.toString()}`)
  }

  const cardStyle = { background: 'var(--theme-surface)' }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Comissões</h1>
        <p className="text-white/50 text-sm mt-1">Painel de comissões por vendedor</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <MonthYearFilter
          month={month}
          year={year}
          onChange={({ month: m, year: y }) => applyFilter({ month: m, year: y })}
        />
        <SelectFilter
          value={dateField}
          onChange={(v) => applyFilter({ dateField: v as 'created_at' | 'paid_at' })}
          options={[
            { value: 'created_at', label: 'Por data de criação' },
            { value: 'paid_at', label: 'Por data de pagamento' },
          ]}
          placeholder="Data por"
        />
        <SelectFilter
          value={vendedorId}
          onChange={(v) => applyFilter({ vendedorId: v })}
          options={members.map((m) => ({ value: m.id, label: m.name }))}
          placeholder="Todos os vendedores"
        />
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente..." />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 p-5" style={cardStyle}>
          <p className="text-xs text-white/50 mb-1">Total Pendente</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--theme-accent)' }}>
            {formatCurrency(painel.total_pendente)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 p-5" style={cardStyle}>
          <p className="text-xs text-white/50 mb-1">Total Pago no Período</p>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(painel.total_pago)}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={cardStyle}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Vendedor</th>
              <th className="text-left px-4 py-3 font-medium">Valor</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Nenhuma comissão no período.
                </td>
              </tr>
            )}
            {filteredItems.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{c.client_name}</td>
                <td className="px-4 py-3 text-white/60">{c.vendedor_name ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{formatCurrency(c.valor_comissao)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/comissoes/${c.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor: 'rgba(255,208,128,0.4)', color: 'var(--theme-accent)' }}
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

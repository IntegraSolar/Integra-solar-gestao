// web/app/(dashboard)/comissoes/ComissoesPainelClient.tsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { ComissoesPainel, ComissaoMember } from '@/lib/comissoes/queries'
import { formatCurrency } from '@/lib/format'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'

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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function ComissoesPainelClient({
  painel,
  members,
  month,
  year,
  vendedorId,
}: {
  painel: ComissoesPainel
  members: ComissaoMember[]
  month: number
  year: number
  vendedorId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const filteredItems = filterBySearch(painel.items, search, ['client_name'])

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams({ month: String(month), year: String(year), vendedorId, ...params })
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
        <select
          value={month}
          onChange={(e) => navigate({ month: e.target.value })}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => navigate({ year: e.target.value })}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={vendedorId}
          onChange={(e) => navigate({ vendedorId: e.target.value })}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="">Todos os vendedores</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
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

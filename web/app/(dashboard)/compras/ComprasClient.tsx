'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CompraClient } from '@/lib/compras/queries'
import { formatCurrency, formatDate } from '@/lib/format'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aguardando: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    confirmado: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    entregue: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = {
    aguardando: 'Aguardando',
    confirmado: 'Confirmado',
    entregue: 'Entregue',
  }
  const cls = map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function ComprasClient({ compras }: { compras: CompraClient[] }) {
  const [search, setSearch] = useState('')
  const filtered = filterBySearch(compras, search, ['client_name', 'fornecedor'])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compras</h1>
          <p className="text-white/50 text-sm mt-1">Pedidos de material e equipamento</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente ou fornecedor..." />
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'var(--theme-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
              <th className="text-left px-4 py-3 font-medium">Valor</th>
              <th className="text-left px-4 py-3 font-medium">Data Prevista</th>
              <th className="text-left px-4 py-3 font-medium">Dias em Compras</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  {search ? 'Nenhum resultado encontrado.' : 'Nenhuma compra em andamento.'}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{c.client_name}</td>
                <td className="px-4 py-3 text-white/60">{c.fornecedor ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{formatCurrency(c.valor)}</td>
                <td className="px-4 py-3 text-white/60">
                  {c.data_prevista ? formatDate(c.data_prevista) : '—'}
                </td>
                <td className="px-4 py-3 text-white/60">
                  {c.dias_em_compras} dias
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/compras/${c.client_id}`}
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
  )
}

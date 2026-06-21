'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProjetoClient } from '@/lib/projetos/queries'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    enviado: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    em_analise: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    aprovado: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    enviado: 'Enviado',
    em_analise: 'Em Análise',
    aprovado: 'Aprovado',
  }
  const cls = map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function ProjetosClient({ projetos }: { projetos: ProjetoClient[] }) {
  const [search, setSearch] = useState('')
  const filtered = filterBySearch(projetos, search, ['client_name', 'client_city'])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projetos</h1>
          <p className="text-white/50 text-sm mt-1">Homologação junto à concessionária</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente ou cidade..." />
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'var(--theme-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Cidade</th>
              <th className="text-left px-4 py-3 font-medium">Responsável</th>
              <th className="text-left px-4 py-3 font-medium">Dias em Projetos</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  {search ? 'Nenhum resultado encontrado.' : 'Nenhum projeto em andamento.'}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{p.client_name}</td>
                <td className="px-4 py-3 text-white/60">{p.client_city ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{p.responsavel_name ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">
                  {p.dias_em_projetos} dias
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/projetos/${p.client_id}`}
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

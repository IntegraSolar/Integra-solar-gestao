'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ObraClient as OClient } from '@/lib/obra/queries'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'
import { TruncationNotice } from '@/components/ui/TruncationNotice'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aguardando: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    em_andamento: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { aguardando: 'Aguardando', em_andamento: 'Em Andamento', concluida: 'Concluída' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function ObraClientComponent({ obras }: { obras: OClient[] }) {
  const [search, setSearch] = useState('')
  const filtered = filterBySearch(obras, search, ['client_name', 'client_city'])

  return (
    <div className="p-6 space-y-6">
      <TruncationNotice count={obras.length} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Obra</h1>
          <p className="text-white/50 text-sm mt-1">Acompanhamento da instalação</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente ou cidade..." />
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'var(--theme-surface)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente<HelpTooltip content="Cliente onde a instalação será realizada." /></th>
              <th className="text-left px-4 py-3 font-medium">Equipe<HelpTooltip content="Time de eletricistas ou técnicos designado para executar a obra." /></th>
              <th className="text-left px-4 py-3 font-medium">Data Prevista<HelpTooltip content="Data estimada para término da instalação." /></th>
              <th className="text-left px-4 py-3 font-medium">Prazo<HelpTooltip content="Dias já decorridos versus prazo máximo do contrato (dias usados / dias totais)." /></th>
              <th className="text-left px-4 py-3 font-medium">Status<HelpTooltip content="Situação da obra: aguardando liberação, em andamento ou concluída." /></th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/40">{search ? 'Nenhum resultado encontrado.' : 'Nenhuma obra em andamento.'}</td></tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{o.client_name}</td>
                <td className="px-4 py-3 text-white/60">{o.equipe_nome ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{o.data_prevista ? new Date(o.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3 text-white/60">{o.contract_max_days ? `${o.dias_usados} / ${o.contract_max_days} dias` : `${o.dias_usados} dias`}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/obra/${o.client_id}`} className="text-xs px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: 'rgba(255,208,128,0.4)', color: 'var(--theme-accent)' }}>Ver</Link>
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

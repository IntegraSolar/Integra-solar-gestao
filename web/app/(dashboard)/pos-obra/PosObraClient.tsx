'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PosObraClient as POClient } from '@/lib/pos-obra/queries'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'
import { TruncationNotice } from '@/components/ui/TruncationNotice'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
  }
  const labels: Record<string, string> = { pendente: 'Pendente', concluida: 'Concluída' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function PosObraClientComponent({ posObras }: { posObras: POClient[] }) {
  const [search, setSearch] = useState('')
  const filtered = filterBySearch(posObras, search, ['client_name', 'client_city'])

  return (
    <div className="p-6 space-y-6">
      <TruncationNotice count={posObras.length} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Pos-Obra</h1>
          <p className="text-white/50 text-sm mt-1">Acompanhamento de satisfação e pos-venda</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente ou cidade..." />
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'var(--theme-surface)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3 font-medium">Cliente<HelpTooltip content="Proprietário do sistema instalado." /></th>
              <th className="text-left px-4 py-3 font-medium">Cidade<HelpTooltip content="Localidade do sistema." /></th>
              <th className="text-left px-4 py-3 font-medium">Prazo<HelpTooltip content="Dias decorridos desde o término da obra." /></th>
              <th className="text-left px-4 py-3 font-medium">NPS<HelpTooltip content="Net Promoter Score: nota de 0 a 10 dada pelo cliente para medir satisfação." /></th>
              <th className="text-left px-4 py-3 font-medium">Status<HelpTooltip content="Situação do pós-venda: pendente (contato ainda não efetuado) ou concluída." /></th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  {search ? 'Nenhum resultado encontrado.' : 'Nenhum pos-obra pendente.'}
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{e.client_name}</td>
                <td className="px-4 py-3 text-white/60">{e.client_city ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">
                  {e.contract_max_days ? `${e.dias_usados} / ${e.contract_max_days} dias` : `${e.dias_usados} dias`}
                </td>
                <td className="px-4 py-3 text-white/60">{e.nps ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/pos-obra/${e.client_id}`}
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

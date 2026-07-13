'use client'

import { useState, useTransition } from 'react'
import type { AuditLog } from '@/lib/auditoria/queries'
import { getAuditLogsPage } from '@/lib/auditoria/actions'
import { Search } from 'lucide-react'

const PAGE_SIZE = 20

// Classifica uma ação em categoria para badge colorido
function classifyAction(action: string): { label: string; color: string; bg: string } {
  const a = action.toLowerCase()
  if (a.includes('exclu') || a.includes('remov') || a.includes('delet'))
    return { label: 'Exclusão', color: '#f87171', bg: 'rgba(239,68,68,0.12)' }
  if (a.includes('cria') || a.includes('adicion') || a.includes('novo') || a.includes('criado'))
    return { label: 'Criação', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' }
  if (a.includes('atualiz') || a.includes('edita') || a.includes('altera') || a.includes('atualizado'))
    return { label: 'Edição', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' }
  if (a.includes('pag') || a.includes('confirm') || a.includes('comissão'))
    return { label: 'Financeiro', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
  if (a.includes('permiss') || a.includes('acesso') || a.includes('colabor'))
    return { label: 'Acesso', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
  if (a.includes('contrato') || a.includes('assinado'))
    return { label: 'Contrato', color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
  if (a.includes('senha'))
    return { label: 'Senha', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' }
  return { label: 'Ação', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' }
}

function ActionBadge({ action }: { action: string }) {
  const { label, color, bg } = classifyAction(action)
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

export default function AuditoriaTab({
  logs: initialLogs,
  total: initialTotal,
}: {
  logs: AuditLog[]
  total: number
}) {
  const [currentLogs, setCurrentLogs] = useState<AuditLog[]>(initialLogs)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, totalCount)

  function goToPage(newPage: number) {
    startTransition(async () => {
      const { logs, total } = await getAuditLogsPage(newPage)
      setCurrentLogs(logs)
      setTotalCount(total)
      setCurrentPage(newPage)
      setSearch('')
    })
  }

  const filtered = search.trim()
    ? currentLogs.filter((l) =>
        [l.action, l.description ?? '', l.user_name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : currentLogs

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border border-white/10 p-5 space-y-4"
        style={{ background: 'var(--theme-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Log de Auditoria</h2>
            {totalCount > 0 && (
              <p className="text-xs text-white/40 mt-0.5">
                {search ? `${filtered.length} resultado(s) nesta página` : `${from}–${to} de ${totalCount} registros`}
              </p>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ação, usuário…"
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none transition-colors w-52"
              style={{
                background: 'var(--theme-input-bg, rgba(255,255,255,0.05))',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--theme-text)',
              }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-white/40 text-sm py-4 text-center">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum registro encontrado.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-3 text-white/40 font-medium text-xs w-24">Tipo</th>
                  <th className="text-left py-2 pr-4 text-white/40 font-medium text-xs">Ação</th>
                  <th className="text-left py-2 pr-4 text-white/40 font-medium text-xs">Descrição</th>
                  <th className="text-left py-2 pr-4 text-white/40 font-medium text-xs whitespace-nowrap">Usuário</th>
                  <th className="text-left py-2 text-white/40 font-medium text-xs whitespace-nowrap">Data/Hora</th>
                </tr>
              </thead>
              <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="py-2.5 pr-4 text-white/80 text-xs whitespace-nowrap">{log.action}</td>
                    <td className="py-2.5 pr-4 text-white/50 text-xs max-w-xs truncate" title={log.description ?? ''}>
                      {log.description ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-white/60 text-xs whitespace-nowrap">
                      {log.user_name ?? '—'}
                    </td>
                    <td className="py-2.5 text-white/40 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-3 pt-2">
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-medium border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
              disabled={currentPage <= 1 || isPending}
              onClick={() => goToPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span className="text-white/40 text-sm tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-medium border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => goToPage(currentPage + 1)}
            >
              Próximo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

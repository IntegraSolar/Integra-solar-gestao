'use client'

import { useState, useTransition } from 'react'
import type { AuditLog } from '@/lib/auditoria/queries'
import { getAuditLogsPage } from '@/lib/auditoria/actions'

const PAGE_SIZE = 20

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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, totalCount)

  function goToPage(newPage: number) {
    startTransition(async () => {
      const { logs, total } = await getAuditLogsPage(newPage)
      setCurrentLogs(logs)
      setTotalCount(total)
      setCurrentPage(newPage)
    })
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border border-white/10 p-5 space-y-4"
        style={{ background: 'var(--theme-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Log de Auditoria</h2>
          {totalCount > 0 && (
            <span className="text-xs text-white/40">
              Mostrando {from}–{to} de {totalCount} registros
            </span>
          )}
        </div>

        {currentLogs.length === 0 ? (
          <p className="text-white/40 text-sm">Nenhum registro encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Usuário</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Ação</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Descrição</th>
                  <th className="text-left py-2 text-white/50 font-medium whitespace-nowrap">
                    Data/Hora
                  </th>
                </tr>
              </thead>
              <tbody className={isPending ? 'opacity-50' : ''}>
                {currentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-4 text-white whitespace-nowrap">
                      {log.user_name ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-white/80 whitespace-nowrap">{log.action}</td>
                    <td className="py-2.5 pr-4 text-white/60 max-w-xs truncate">
                      {log.description ?? '—'}
                    </td>
                    <td className="py-2.5 text-white/50 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
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
            <span className="text-white/40 text-sm">
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

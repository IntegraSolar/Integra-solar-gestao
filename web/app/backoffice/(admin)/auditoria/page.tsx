import type { Metadata } from 'next'
import Link from 'next/link'
import { listarAuditoria } from '@/lib/backoffice/auditoria/queries'

export const metadata: Metadata = { title: 'Auditoria — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

const ACTION_BADGE: Record<string, { color: string }> = {
  bloquear_empresa:   { color: '#dc2626' },
  desbloquear_empresa:{ color: '#16a34a' },
  login:              { color: '#6b7280' },
}

export default async function AuditoriaPage() {
  const logs = await listarAuditoria(200)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0E2236]">Auditoria</h1>
        <p className="text-sm text-[#6B8CA4] mt-0.5">Últimas {logs.length} ações registradas</p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2ECF4]">
              {['Data/Hora', 'Admin', 'Ação', 'Descrição', 'Empresa'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#9BAEBF]">
                  Nenhuma ação registrada ainda.
                </td>
              </tr>
            )}
            {logs.map((log) => {
              const badge = ACTION_BADGE[log.action] ?? { color: '#6b7280' }
              return (
                <tr key={log.id} className="border-b border-[#F0F4F8] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-5 py-3.5 text-[#9BAEBF] text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3.5 text-[#4A6580]">{log.user_name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: `${badge.color}18`, color: badge.color }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#4A6580] max-w-xs truncate">{log.description ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {log.organization_id ? (
                      <Link href={`/backoffice/empresas/${log.organization_id}`}
                        className="text-[#1A3A5C] hover:underline font-medium text-xs">
                        {log.organization_name ?? log.organization_id.slice(0, 8) + '…'}
                      </Link>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

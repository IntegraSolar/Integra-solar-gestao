import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Dashboard — Backoffice Integra Solar' }

async function getStats() {
  const admin = createAdminClient()
  const [orgs, subscriptions] = await Promise.all([
    admin.from('organizations').select('id', { count: 'exact', head: true }),
    admin.from('assinaturas').select('status', { count: 'exact' }),
  ])
  const total = orgs.count ?? 0
  const byStatus = ((subscriptions.data ?? []) as { status: string }[]).reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }),
    {}
  )
  return { total, byStatus }
}

export default async function BackofficeDashboard() {
  const { total, byStatus } = await getStats()

  const cards = [
    { label: 'Empresas cadastradas', value: total, color: '#1A3A5C' },
    { label: 'Assinaturas ativas', value: byStatus['active'] ?? 0, color: '#28944a' },
    { label: 'Em trial', value: byStatus['trial'] ?? 0, color: '#f59e0b' },
    { label: 'Bloqueadas / inativas', value: (byStatus['blocked'] ?? 0) + (byStatus['inactive'] ?? 0), color: '#dc2626' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0E2236] mb-1">Dashboard</h1>
      <p className="text-sm text-[#6B8CA4] mb-8">Visão geral da plataforma</p>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9BAEBF] mb-2">{c.label}</p>
            <p className="text-4xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6">
        <p className="text-sm font-semibold text-[#1A3A5C] mb-4">Próximas funcionalidades</p>
        <ul className="space-y-2 text-sm text-[#6B8CA4]">
          <li>• Listagem e gerenciamento de empresas</li>
          <li>• Controle de assinaturas e planos</li>
          <li>• Impersonação de contas (visualizar como cliente)</li>
          <li>• Logs de auditoria</li>
          <li>• Configurações globais da plataforma</li>
        </ul>
      </div>
    </div>
  )
}

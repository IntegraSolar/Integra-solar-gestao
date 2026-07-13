import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Card, ButtonLink } from '@/components/backoffice/ui'

export const metadata: Metadata = { title: 'Dashboard — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

async function getStats() {
  const admin = createAdminClient()
  const [orgs, subs, blocked, users] = await Promise.all([
    admin.from('organizations').select('id', { count: 'exact', head: true }),
    admin.from('subscriptions').select('status'),
    admin.from('organizations').select('id', { count: 'exact', head: true }).not('blocked_at', 'is', null),
    admin.from('organization_members').select('id', { count: 'exact', head: true }),
  ])
  const byStatus = ((subs.data ?? []) as { status: string }[]).reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }),
    {}
  )
  return {
    total: orgs.count ?? 0,
    ativas: byStatus['active'] ?? 0,
    trial: byStatus['trial'] ?? 0,
    bloqueadas: blocked.count ?? 0,
    usuarios: users.count ?? 0,
  }
}

const StatCard = ({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: string }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7C8D9E]">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: tone }}>{value}</p>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: `${tone}14` }}>
        {icon}
      </span>
    </div>
  </Card>
)

export default async function BackofficeDashboard() {
  const s = await getStats()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral da plataforma"
        action={<ButtonLink href="/backoffice/empresas/nova" variant="primary">+ Nova Empresa</ButtonLink>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Empresas" value={s.total} tone="#1A3A5C" icon="🏢" />
        <StatCard label="Assinaturas ativas" value={s.ativas} tone="#12805C" icon="✓" />
        <StatCard label="Em trial" value={s.trial} tone="#B45309" icon="◷" />
        <StatCard label="Bloqueadas" value={s.bloqueadas} tone="#C11B1B" icon="⊘" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-sm font-bold text-[#0E1B2A] mb-4">Ações rápidas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink href="/backoffice/empresas" variant="secondary" className="justify-start">🏢 Gerenciar empresas</ButtonLink>
            <ButtonLink href="/backoffice/assinaturas" variant="secondary" className="justify-start">💳 Gerenciar assinaturas</ButtonLink>
            <ButtonLink href="/backoffice/usuarios" variant="secondary" className="justify-start">👥 Ver usuários</ButtonLink>
            <ButtonLink href="/backoffice/auditoria" variant="secondary" className="justify-start">📋 Trilha de auditoria</ButtonLink>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-bold text-[#0E1B2A] mb-4">Resumo</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[#45586E]">Total de empresas</dt>
              <dd className="font-bold text-[#0E1B2A] tabular-nums">{s.total}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[#45586E]">Usuários na plataforma</dt>
              <dd className="font-bold text-[#0E1B2A] tabular-nums">{s.usuarios}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[#45586E]">Assinaturas ativas</dt>
              <dd className="font-bold text-[#12805C] tabular-nums">{s.ativas}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}

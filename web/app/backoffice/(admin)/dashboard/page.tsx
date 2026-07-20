import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { PageHeader, Card, ButtonLink } from '@/components/backoffice/ui'
import { listarEmpresas } from '@/lib/backoffice/empresas/queries'
import { NIVEL_ESTILO } from '@/lib/backoffice/inatividade'

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

/** Empresas paradas há 1+ dia útil, das mais críticas para as menos. */
async function getInativas() {
  const empresas = await listarEmpresas()
  return empresas
    .filter((e) => e.inatividade.tipo === 'inativa' && !e.blocked_at)
    .sort((a, b) => b.inatividade.dias_uteis - a.inatividade.dias_uteis)
}

export default async function BackofficeDashboard() {
  const [s, inativas] = await Promise.all([getStats(), getInativas()])

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

      <Card className="p-6 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-[#0E1B2A]">Alerta de inatividade</h2>
          <span className="text-xs text-[#7C8D9E]">sem criar propostas · dias úteis</span>
        </div>

        {inativas.length === 0 ? (
          <p className="text-sm text-[#12805C]">Nenhuma empresa parada — todas criaram proposta hoje.</p>
        ) : (
          <ul className="divide-y divide-[#F0F4F8]">
            {inativas.map((e) => {
              const estilo = NIVEL_ESTILO[e.inatividade.nivel]
              return (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/backoffice/empresas/${e.id}`} className="text-sm font-semibold text-[#1A3A5C] hover:text-[#F59E0B] transition-colors">
                    {e.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-[#7C8D9E] tabular-nums">
                      {e.ultima_proposta ? new Date(e.ultima_proposta).toLocaleDateString('pt-BR') : '—'}
                    </span>
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums"
                      style={{ background: `${estilo.cor}14`, color: estilo.cor }}
                    >
                      {e.inatividade.dias_uteis} dia{e.inatividade.dias_uteis !== 1 ? 's' : ''}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

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

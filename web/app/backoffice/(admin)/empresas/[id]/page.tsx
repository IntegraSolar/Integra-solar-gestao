import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buscarEmpresa } from '@/lib/backoffice/empresas/queries'
import { PageHeader, Card, CardHeader, Table, EmptyRow, Badge } from '@/components/backoffice/ui'
import { BloquearEmpresaButton, DesbloquearEmpresaButton, EditarEmpresaButton, ExcluirEmpresaButton } from './EmpresaActions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const empresa = await buscarEmpresa(id)
  return { title: `${empresa?.name ?? 'Empresa'} — Backoffice` }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C8D9E]">{label}</span>
      <span className="text-sm text-[#0E1B2A]">{value || '—'}</span>
    </div>
  )
}

export default async function EmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresa = await buscarEmpresa(id)
  if (!empresa) notFound()

  const bloqueada = !!empresa.blocked_at

  return (
    <div>
      <PageHeader
        title={empresa.name}
        back={{ href: '/backoffice/empresas', label: 'Voltar para Empresas' }}
        action={
          <div className="flex items-center gap-2">
            <EditarEmpresaButton id={empresa.id} currentName={empresa.name} currentPlan={empresa.plan} currentStatus={empresa.status} />
            {bloqueada ? <DesbloquearEmpresaButton id={empresa.id} /> : <BloquearEmpresaButton id={empresa.id} />}
            <ExcluirEmpresaButton id={empresa.id} name={empresa.name} />
          </div>
        }
      />

      {bloqueada && (
        <div className="mb-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-5 py-4">
          <p className="text-sm font-semibold text-[#C11B1B]">Empresa bloqueada</p>
          <p className="text-xs text-[#DC2626] mt-0.5">
            Desde {new Date(empresa.blocked_at!).toLocaleDateString('pt-BR')}
            {empresa.blocked_reason ? ` — ${empresa.blocked_reason}` : ''}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dados da organização" />
          <div className="grid grid-cols-2 gap-5 p-6">
            <InfoRow label="Nome" value={empresa.name} />
            <InfoRow label="Plano" value={empresa.plan} />
            <InfoRow label="Status" value={empresa.status} />
            <InfoRow label="Cadastro" value={new Date(empresa.created_at).toLocaleDateString('pt-BR')} />
            <InfoRow label="Trial até" value={empresa.trial_ends_at ? new Date(empresa.trial_ends_at).toLocaleDateString('pt-BR') : null} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Assinatura" />
          <div className="p-6">
            {empresa.assinatura ? (
              <div className="grid grid-cols-2 gap-5">
                <InfoRow label="Plano" value={empresa.assinatura.plan} />
                <InfoRow label="Status" value={empresa.assinatura.status} />
                <InfoRow label="Vencimento" value={empresa.assinatura.expires_at ? new Date(empresa.assinatura.expires_at).toLocaleDateString('pt-BR') : null} />
              </div>
            ) : (
              <p className="text-sm text-[#7C8D9E]">Sem assinatura registrada.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title={`Membros (${empresa.total_users})`} />
        {empresa.usuarios.length === 0 ? (
          <div className="p-6"><p className="text-sm text-[#7C8D9E]">Nenhum membro cadastrado.</p></div>
        ) : (
          <Table head={['Nome', 'E-mail', 'Perfil', 'Desde']}>
            {empresa.usuarios.map((u) => (
              <tr key={u.id} className="border-b border-[#F0F4F8] last:border-0">
                <td className="px-5 py-3 font-semibold text-[#0E1B2A]">{u.full_name}</td>
                <td className="px-5 py-3 text-[#45586E]">{u.email}</td>
                <td className="px-5 py-3"><Badge tone={u.role === 'owner' ? 'purple' : 'gray'}>{u.role}</Badge></td>
                <td className="px-5 py-3 text-[#7C8D9E] text-xs tabular-nums">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

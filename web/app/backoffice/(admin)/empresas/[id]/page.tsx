import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buscarEmpresa } from '@/lib/backoffice/empresas/queries'
import { BloquearEmpresaButton, DesbloquearEmpresaButton } from './EmpresaActions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const empresa = await buscarEmpresa(id)
  return { title: `${empresa?.fantasy_name ?? 'Empresa'} — Backoffice` }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">{label}</span>
      <span className="text-sm text-[#1A3A5C]">{value || '—'}</span>
    </div>
  )
}

export default async function EmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresa = await buscarEmpresa(id)
  if (!empresa) notFound()

  const bloqueada = !!empresa.blocked_at

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/backoffice/empresas" className="text-xs text-[#6B8CA4] hover:underline mb-1 inline-block">
            ← Voltar para Empresas
          </Link>
          <h1 className="text-2xl font-bold text-[#0E2236]">{empresa.fantasy_name || empresa.corporate_name}</h1>
          {empresa.fantasy_name && <p className="text-sm text-[#6B8CA4]">{empresa.corporate_name}</p>}
        </div>

        <div className="flex items-center gap-2">
          {bloqueada ? (
            <DesbloquearEmpresaButton id={empresa.id} />
          ) : (
            <BloquearEmpresaButton id={empresa.id} />
          )}
        </div>
      </div>

      {/* Alerta de bloqueio */}
      {bloqueada && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Empresa bloqueada</p>
          <p className="text-xs text-red-600 mt-0.5">
            Desde {new Date(empresa.blocked_at!).toLocaleDateString('pt-BR')}
            {empresa.blocked_reason ? ` — ${empresa.blocked_reason}` : ''}
          </p>
        </div>
      )}

      {/* Dados cadastrais */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6 mb-4">
        <h2 className="text-sm font-semibold text-[#1A3A5C] mb-5">Dados cadastrais</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoRow label="Razão Social" value={empresa.corporate_name} />
          <InfoRow label="Nome Fantasia" value={empresa.fantasy_name} />
          <InfoRow label="CNPJ" value={empresa.cnpj} />
          <InfoRow label="E-mail" value={empresa.email} />
          <InfoRow label="Telefone" value={empresa.phone} />
          <InfoRow label="Cidade/UF" value={empresa.city ? `${empresa.city}/${empresa.state?.toUpperCase()}` : null} />
          <InfoRow label="Endereço" value={[empresa.street, empresa.number, empresa.complement].filter(Boolean).join(', ')} />
          <InfoRow label="Bairro" value={empresa.neighborhood} />
          <InfoRow label="CEP" value={empresa.zip_code} />
        </div>
      </div>

      {/* Assinatura */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6 mb-4">
        <h2 className="text-sm font-semibold text-[#1A3A5C] mb-5">Assinatura</h2>
        {empresa.assinatura ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Plano" value={empresa.assinatura.plano} />
            <InfoRow label="Status" value={empresa.assinatura.status} />
            <InfoRow label="Vencimento" value={empresa.assinatura.data_fim ? new Date(empresa.assinatura.data_fim).toLocaleDateString('pt-BR') : null} />
            <InfoRow label="Trial até" value={empresa.trial_ends_at ? new Date(empresa.trial_ends_at).toLocaleDateString('pt-BR') : null} />
          </div>
        ) : (
          <p className="text-sm text-[#9BAEBF]">Sem assinatura registrada.</p>
        )}
      </div>

      {/* Usuários */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6">
        <h2 className="text-sm font-semibold text-[#1A3A5C] mb-5">
          Usuários ({empresa.total_users})
        </h2>
        {empresa.usuarios.length === 0 ? (
          <p className="text-sm text-[#9BAEBF]">Nenhum usuário cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F4F8]">
                {['Nome', 'E-mail', 'Perfil', 'Status', 'Desde'].map((h) => (
                  <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresa.usuarios.map((u) => (
                <tr key={u.id} className="border-b border-[#F8FAFC]">
                  <td className="py-3 pr-4 font-medium text-[#1A3A5C]">{u.name}</td>
                  <td className="py-3 pr-4 text-[#4A6580]">{u.email}</td>
                  <td className="py-3 pr-4 text-[#4A6580]">{u.is_super_admin ? 'Admin' : 'Usuário'}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 text-[#9BAEBF] text-xs">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

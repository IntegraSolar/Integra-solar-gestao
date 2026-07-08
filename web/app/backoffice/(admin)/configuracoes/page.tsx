import type { Metadata } from 'next'
import { listarAdmins } from '@/lib/backoffice/configuracoes/actions'
import { NovoAdminForm } from './AdminForm'
import { RemoverAdminButton } from './RemoverAdminButton'
import { getCurrentPlatformUser } from '@/lib/backoffice/auth/getCurrentPlatformUser'

export const metadata: Metadata = { title: 'Configurações — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  support:     'Suporte',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: '#7c3aed',
  admin:       '#1A3A5C',
  support:     '#6b7280',
}

export default async function ConfiguracoesPage() {
  const [admins, currentUser] = await Promise.all([listarAdmins(), getCurrentPlatformUser()])
  const isSuperAdmin = currentUser?.role === 'super_admin'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0E2236]">Configurações</h1>
        <p className="text-sm text-[#6B8CA4] mt-0.5">Gerenciamento de acesso ao backoffice</p>
      </div>

      {/* Lista de admins */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#1A3A5C] mb-5">
          Usuários com acesso ({admins.length})
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F0F4F8]">
              {['Nome', 'E-mail', 'Perfil', 'Desde', ''].map((h) => (
                <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-[#F8FAFC]">
                <td className="py-3 pr-4 font-medium text-[#1A3A5C]">
                  {a.name}
                  {a.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-[#9BAEBF]">(você)</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-[#4A6580]">{a.email}</td>
                <td className="py-3 pr-4">
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: `${ROLE_COLOR[a.role]}18`, color: ROLE_COLOR[a.role] }}>
                    {ROLE_LABEL[a.role] ?? a.role}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[#9BAEBF] text-xs">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="py-3">
                  {isSuperAdmin && a.id !== currentUser?.id && (
                    <RemoverAdminButton id={a.id} name={a.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulário novo admin — só super_admin pode criar */}
      {isSuperAdmin && (
        <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] p-6">
          <h2 className="text-sm font-semibold text-[#1A3A5C] mb-5">Adicionar novo usuário</h2>
          <NovoAdminForm />
        </div>
      )}

      {!isSuperAdmin && (
        <div className="rounded-2xl border border-[#E2ECF4] px-5 py-4 text-sm text-[#9BAEBF]">
          Apenas Super Admins podem criar ou remover usuários do backoffice.
        </div>
      )}
    </div>
  )
}

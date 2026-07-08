import type { Metadata } from 'next'
import Link from 'next/link'
import { listarUsuarios } from '@/lib/backoffice/usuarios/queries'

export const metadata: Metadata = { title: 'Usuários — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const usuarios = await listarUsuarios(q)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0E2236]">Usuários</h1>
        <p className="text-sm text-[#6B8CA4] mt-0.5">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Busca */}
      <form method="GET" className="mb-6">
        <div className="flex gap-3 max-w-xl">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, e-mail ou empresa..."
            className="flex-1 rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10"
          />
          <button type="submit"
            className="rounded-xl bg-[#1A3A5C] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#0E2236] transition-colors">
            Buscar
          </button>
          {q && (
            <Link href="/backoffice/usuarios"
              className="rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#6B8CA4] hover:bg-gray-50 transition-colors">
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* Tabela */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2ECF4]">
              {['Nome', 'E-mail', 'Empresa', 'Perfil', 'Membro desde'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#9BAEBF]">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-[#F0F4F8] hover:bg-[#F8FAFC] transition-colors">
                <td className="px-5 py-3.5 font-medium text-[#1A3A5C]">{u.full_name}</td>
                <td className="px-5 py-3.5 text-[#4A6580]">{u.email}</td>
                <td className="px-5 py-3.5">
                  <Link href={`/backoffice/empresas/${u.organization_id}`}
                    className="text-[#1A3A5C] hover:underline font-medium">
                    {u.organization_name}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-[#4A6580] capitalize">{u.role ?? '—'}</td>
                <td className="px-5 py-3.5 text-[#9BAEBF] text-xs">
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

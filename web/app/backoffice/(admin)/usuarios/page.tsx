import type { Metadata } from 'next'
import Link from 'next/link'
import { listarUsuarios } from '@/lib/backoffice/usuarios/queries'
import { PageHeader, Card, Table, EmptyRow, Button, ButtonLink, inputCls } from '@/components/backoffice/ui'

export const metadata: Metadata = { title: 'Usuários — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const usuarios = await listarUsuarios(q)

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle={`${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} nas empresas clientes`}
      />

      <form method="GET" className="mb-5">
        <div className="flex gap-3 max-w-xl">
          <input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou empresa..." className={`flex-1 ${inputCls}`} />
          <Button type="submit" variant="primary">Buscar</Button>
          {q && <ButtonLink href="/backoffice/usuarios" variant="secondary">Limpar</ButtonLink>}
        </div>
      </form>

      <Card className="overflow-hidden">
        <Table head={['Nome', 'E-mail', 'Empresa', 'Perfil', 'Membro desde']}>
          {usuarios.length === 0 && <EmptyRow colSpan={5}>Nenhum usuário encontrado.</EmptyRow>}
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#F7FAFC] transition-colors">
              <td className="px-5 py-3.5 font-semibold text-[#0E1B2A]">{u.full_name}</td>
              <td className="px-5 py-3.5 text-[#45586E]">{u.email}</td>
              <td className="px-5 py-3.5">
                <Link href={`/backoffice/empresas/${u.organization_id}`} className="font-semibold text-[#1A3A5C] hover:text-[#F59E0B] transition-colors">
                  {u.organization_name}
                </Link>
              </td>
              <td className="px-5 py-3.5 text-[#45586E] capitalize">{u.role ?? '—'}</td>
              <td className="px-5 py-3.5 text-[#7C8D9E] text-xs tabular-nums">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

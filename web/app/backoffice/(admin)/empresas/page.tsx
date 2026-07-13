import type { Metadata } from 'next'
import Link from 'next/link'
import { listarEmpresas } from '@/lib/backoffice/empresas/queries'
import { PageHeader, Card, Table, EmptyRow, Badge, ButtonLink, Button, inputCls } from '@/components/backoffice/ui'

export const metadata: Metadata = { title: 'Empresas — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

type Tone = 'green' | 'amber' | 'red' | 'gray'
const STATUS: Record<string, { label: string; tone: Tone }> = {
  active:   { label: 'Ativa',     tone: 'green' },
  trial:    { label: 'Trial',     tone: 'amber' },
  inactive: { label: 'Inativa',   tone: 'gray' },
  blocked:  { label: 'Bloqueada', tone: 'red' },
  canceled: { label: 'Cancelada', tone: 'gray' },
}

function StatusBadge({ status, bloqueada }: { status: string | null; bloqueada: boolean }) {
  if (bloqueada) return <Badge tone="red">Bloqueada</Badge>
  const s = STATUS[status ?? ''] ?? { label: status ?? 'Sem plano', tone: 'gray' as Tone }
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const empresas = await listarEmpresas(q)

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle={`${empresas.length} empresa${empresas.length !== 1 ? 's' : ''} cadastrada${empresas.length !== 1 ? 's' : ''}`}
        action={<ButtonLink href="/backoffice/empresas/nova" variant="primary">+ Nova Empresa</ButtonLink>}
      />

      <form method="GET" className="mb-5">
        <div className="flex gap-3 max-w-xl">
          <input name="q" defaultValue={q} placeholder="Buscar por nome..." className={`flex-1 ${inputCls}`} />
          <Button type="submit" variant="primary">Buscar</Button>
          {q && <ButtonLink href="/backoffice/empresas" variant="secondary">Limpar</ButtonLink>}
        </div>
      </form>

      <Card className="overflow-hidden">
        <Table head={['Empresa', 'Plano', 'Status', 'Usuários', 'Cadastro', '']}>
          {empresas.length === 0 && <EmptyRow colSpan={6}>Nenhuma empresa encontrada.</EmptyRow>}
          {empresas.map((e) => (
            <tr key={e.id} className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#F7FAFC] transition-colors">
              <td className="px-5 py-3.5 font-semibold text-[#1A3A5C]">{e.name}</td>
              <td className="px-5 py-3.5 text-[#45586E] capitalize">{e.assinatura?.plan ?? e.plan ?? '—'}</td>
              <td className="px-5 py-3.5"><StatusBadge status={e.assinatura?.status ?? e.status ?? null} bloqueada={!!e.blocked_at} /></td>
              <td className="px-5 py-3.5 text-center text-[#45586E] tabular-nums">{e.total_users}</td>
              <td className="px-5 py-3.5 text-[#7C8D9E] text-xs tabular-nums">{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
              <td className="px-5 py-3.5 text-right">
                <Link href={`/backoffice/empresas/${e.id}`} className="text-xs font-bold text-[#1A3A5C] hover:text-[#F59E0B] transition-colors">
                  Gerenciar →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}

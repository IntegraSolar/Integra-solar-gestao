import type { Metadata } from 'next'
import Link from 'next/link'
import { listarAuditoria } from '@/lib/backoffice/auditoria/queries'
import { PageHeader, Card, Table, EmptyRow, Badge } from '@/components/backoffice/ui'

export const metadata: Metadata = { title: 'Auditoria — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue'
const ACTION: Record<string, { label: string; tone: Tone }> = {
  bloquear_empresa:     { label: 'Bloqueio',       tone: 'red' },
  desbloquear_empresa:  { label: 'Desbloqueio',    tone: 'green' },
  editar_empresa:       { label: 'Edição',         tone: 'blue' },
  excluir_empresa:      { label: 'Exclusão',       tone: 'red' },
  criar_empresa:        { label: 'Nova empresa',   tone: 'green' },
  login:                { label: 'Login',          tone: 'gray' },
}

export default async function AuditoriaPage() {
  const logs = await listarAuditoria(200)

  return (
    <div>
      <PageHeader title="Auditoria" subtitle={`Últimas ${logs.length} ações registradas`} />

      <Card className="overflow-hidden">
        <Table head={['Data / Hora', 'Admin', 'Ação', 'Descrição', 'Empresa']}>
          {logs.length === 0 && <EmptyRow colSpan={5}>Nenhuma ação registrada ainda.</EmptyRow>}
          {logs.map((log) => {
            const a = ACTION[log.action] ?? { label: log.action, tone: 'gray' as Tone }
            return (
              <tr key={log.id} className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#F7FAFC] transition-colors">
                <td className="px-5 py-3.5 text-[#7C8D9E] text-xs whitespace-nowrap tabular-nums">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-[#45586E]">{log.user_name ?? '—'}</td>
                <td className="px-5 py-3.5"><Badge tone={a.tone}>{a.label}</Badge></td>
                <td className="px-5 py-3.5 text-[#45586E] max-w-xs truncate">{log.description ?? '—'}</td>
                <td className="px-5 py-3.5">
                  {log.organization_id ? (
                    <Link href={`/backoffice/empresas/${log.organization_id}`} className="text-xs font-semibold text-[#1A3A5C] hover:text-[#F59E0B] transition-colors">
                      {log.organization_name ?? log.organization_id.slice(0, 8) + '…'}
                    </Link>
                  ) : '—'}
                </td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </div>
  )
}

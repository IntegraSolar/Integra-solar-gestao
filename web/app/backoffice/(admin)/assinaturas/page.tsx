import type { Metadata } from 'next'
import Link from 'next/link'
import { listarAssinaturas } from '@/lib/backoffice/assinaturas/queries'
import { PageHeader, Card, Table, EmptyRow, Badge } from '@/components/backoffice/ui'

export const metadata: Metadata = { title: 'Assinaturas — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Tone = 'green' | 'amber' | 'red' | 'gray'
const STATUS: Record<string, { label: string; tone: Tone }> = {
  active:   { label: 'Ativa',     tone: 'green' },
  trial:    { label: 'Trial',     tone: 'amber' },
  past_due: { label: 'Vencida',   tone: 'red' },
  canceled: { label: 'Cancelada', tone: 'gray' },
}

const TABS = [
  { value: 'all',            label: 'Todas' },
  { value: 'active',         label: 'Ativas' },
  { value: 'trial',          label: 'Trial' },
  { value: 'past_due',       label: 'Vencidas' },
  { value: 'canceled',       label: 'Canceladas' },
  { value: 'sem_assinatura', label: 'Sem assinatura' },
  { value: 'blocked',        label: 'Bloqueadas' },
]

export default async function AssinaturasPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const current = status ?? 'all'
  const rows = await listarAssinaturas(current)

  const mrr = rows
    .filter((r) => r.subscription?.status === 'active')
    .reduce((acc, r) => acc + (r.subscription?.billing_cycle === 'yearly' ? (r.subscription?.amount ?? 0) / 12 : r.subscription?.amount ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Assinaturas"
        subtitle={`${rows.length} empresa${rows.length !== 1 ? 's' : ''} · MRR ativo ${brl(mrr)}`}
      />

      <div className="flex flex-wrap gap-1 mb-6 bg-[#EEF3F7] rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/backoffice/assinaturas' : `/backoffice/assinaturas?status=${tab.value}`}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              current === tab.value ? 'bg-white text-[#1A3A5C] shadow-sm' : 'text-[#5A7590] hover:text-[#1A3A5C]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <Table head={['Empresa', 'Plano', 'Mensalidade', 'Status', 'Vencimento', '']}>
          {rows.length === 0 && <EmptyRow colSpan={6}>Nenhuma empresa encontrada.</EmptyRow>}
          {rows.map((r) => {
            const sub = r.subscription
            const st = sub ? (STATUS[sub.status] ?? { label: sub.status, tone: 'gray' as Tone }) : null
            const vencida = sub?.expires_at && new Date(sub.expires_at) < new Date()
            return (
              <tr key={r.id} className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#F7FAFC] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-[#1A3A5C]">{r.name}</td>
                <td className="px-5 py-3.5 text-[#45586E] capitalize">{sub?.plan ?? '—'}</td>
                <td className="px-5 py-3.5 text-[#45586E] tabular-nums">{sub ? brl(sub.amount) : '—'}</td>
                <td className="px-5 py-3.5">
                  {r.blocked_at ? <Badge tone="red">Bloqueada</Badge>
                    : st ? <Badge tone={st.tone}>{st.label}</Badge>
                    : <Badge tone="gray">Sem assinatura</Badge>}
                </td>
                <td className="px-5 py-3.5 text-xs tabular-nums">
                  {sub?.expires_at
                    ? <span className={vencida ? 'text-[#C11B1B] font-semibold' : 'text-[#7C8D9E]'}>{new Date(sub.expires_at).toLocaleDateString('pt-BR')}</span>
                    : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/backoffice/empresas/${r.id}`} className="text-xs font-bold text-[#1A3A5C] hover:text-[#F59E0B] transition-colors">
                    Gerenciar →
                  </Link>
                </td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </div>
  )
}

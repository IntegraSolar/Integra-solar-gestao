import type { Metadata } from 'next'
import Link from 'next/link'
import { listarAssinaturas } from '@/lib/backoffice/assinaturas/queries'

export const metadata: Metadata = { title: 'Assinaturas — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:   { label: 'Ativa',     color: '#16a34a' },
  trial:    { label: 'Trial',     color: '#d97706' },
  inactive: { label: 'Inativa',   color: '#6b7280' },
  canceled: { label: 'Cancelada', color: '#dc2626' },
  past_due: { label: 'Vencida',   color: '#dc2626' },
}

function StatusBadge({ status, bloqueada }: { status: string | null; bloqueada: boolean }) {
  if (bloqueada) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: '#fee2e218', color: '#dc2626' }}>Bloqueada</span>
    )
  }
  const s = STATUS_CONFIG[status ?? ''] ?? { label: status ?? '—', color: '#6b7280' }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: `${s.color}18`, color: s.color }}>
      {s.label}
    </span>
  )
}

const TABS = [
  { value: 'all',      label: 'Todas' },
  { value: 'active',   label: 'Ativas' },
  { value: 'trial',    label: 'Trial' },
  { value: 'inactive', label: 'Inativas' },
  { value: 'blocked',  label: 'Bloqueadas' },
]

function formatBRL(value: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const currentStatus = status ?? 'all'
  const assinaturas = await listarAssinaturas(currentStatus)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0E2236]">Assinaturas</h1>
        <p className="text-sm text-[#6B8CA4] mt-0.5">{assinaturas.length} empresa{assinaturas.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-1 mb-6 bg-[#F0F4F8] rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/backoffice/assinaturas' : `/backoffice/assinaturas?status=${tab.value}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              currentStatus === tab.value
                ? 'bg-white text-[#1A3A5C] shadow-sm'
                : 'text-[#6B8CA4] hover:text-[#1A3A5C]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#E2ECF4] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2ECF4]">
              {['Empresa', 'Plano', 'Status', 'Valor', 'Trial até', 'Cadastro', ''].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assinaturas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#9BAEBF]">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            )}
            {assinaturas.map((a) => (
              <tr key={a.id} className="border-b border-[#F0F4F8] hover:bg-[#F8FAFC] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-[#1A3A5C]">{a.name}</td>
                <td className="px-5 py-3.5 text-[#4A6580] capitalize">{a.plan ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={a.status} bloqueada={!!a.blocked_at} />
                </td>
                <td className="px-5 py-3.5 text-[#4A6580]">{formatBRL(a.amount)}</td>
                <td className="px-5 py-3.5 text-xs">
                  {a.trial_ends_at ? (
                    <span className={new Date(a.trial_ends_at) < new Date() ? 'text-red-500 font-semibold' : 'text-[#9BAEBF]'}>
                      {new Date(a.trial_ends_at).toLocaleDateString('pt-BR')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-3.5 text-[#9BAEBF] text-xs">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3.5">
                  <Link href={`/backoffice/empresas/${a.id}`}
                    className="text-xs font-semibold text-[#1A3A5C] hover:underline">
                    Ver detalhes →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

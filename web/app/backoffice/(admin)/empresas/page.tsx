import type { Metadata } from 'next'
import Link from 'next/link'
import { listarEmpresas } from '@/lib/backoffice/empresas/queries'

export const metadata: Metadata = { title: 'Empresas — Backoffice Integra Solar' }
export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: 'Ativa',     color: '#16a34a' },
  trial:    { label: 'Trial',     color: '#d97706' },
  inactive: { label: 'Inativa',   color: '#6b7280' },
  blocked:  { label: 'Bloqueada', color: '#dc2626' },
  canceled: { label: 'Cancelada', color: '#6b7280' },
}

function StatusBadge({ status, bloqueada }: { status: string | null; bloqueada: boolean }) {
  if (bloqueada) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: '#fee2e2', color: '#dc2626' }}>Bloqueada</span>
    )
  }
  const s = STATUS_BADGE[status ?? ''] ?? { label: status ?? 'Sem plano', color: '#6b7280' }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: `${s.color}18`, color: s.color }}>{s.label}</span>
  )
}

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const empresas = await listarEmpresas(q)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0E2236]">Empresas</h1>
          <p className="text-sm text-[#6B8CA4] mt-0.5">{empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/backoffice/empresas/nova"
          className="rounded-xl bg-[#1A3A5C] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#0E2236] transition-colors"
        >
          + Nova Empresa
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className="mb-6">
        <div className="flex gap-3 max-w-xl">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome..."
            className="flex-1 rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10"
          />
          <button type="submit"
            className="rounded-xl bg-[#1A3A5C] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#0E2236] transition-colors">
            Buscar
          </button>
          {q && (
            <Link href="/backoffice/empresas"
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
              {['Empresa', 'Plano', 'Status', 'Usuários', 'Cadastro', ''].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9BAEBF]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#9BAEBF]">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            )}
            {empresas.map((e) => (
              <tr key={e.id} className="border-b border-[#F0F4F8] hover:bg-[#F8FAFC] transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-[#1A3A5C]">{e.name}</p>
                </td>
                <td className="px-5 py-3.5 text-[#4A6580] capitalize">{e.assinatura?.plan ?? e.plan ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={e.assinatura?.status ?? e.status ?? null} bloqueada={!!e.blocked_at} />
                </td>
                <td className="px-5 py-3.5 text-center text-[#4A6580]">{e.total_users}</td>
                <td className="px-5 py-3.5 text-[#9BAEBF] text-xs">
                  {new Date(e.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3.5">
                  <Link href={`/backoffice/empresas/${e.id}`}
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

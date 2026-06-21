// web/app/(dashboard)/financeiro/FinanceiroPainelClient.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FinanceiroPainel, FinanceiroMember, FinanceiroInstallment } from '@/lib/financeiro/queries'
import { formatCurrency, formatDate } from '@/lib/format'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function StatusBadge({ status }: { status: 'pendente' | 'confirmada' }) {
  const isConfirmed = status === 'confirmada'
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        background: isConfirmed ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
        color: isConfirmed ? '#10B981' : '#F59E0B',
        border: `1px solid ${isConfirmed ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
      }}
    >
      {isConfirmed ? 'Confirmada' : 'Pendente'}
    </span>
  )
}

function Card({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4 rounded-xl"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: accent ?? 'var(--theme-text)' }}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}

function InstallmentRow({ inst }: { inst: FinanceiroInstallment }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)' }}>
          {inst.client_name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
          {inst.position === 1 ? 'Entrada' : `Parcela ${inst.position}`} ·{' '}
          {formatDate(inst.due_date)}
        </p>
      </div>
      <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--theme-text)' }}>
        {formatCurrency(inst.amount)}
      </p>
      <StatusBadge status={inst.status} />
      <Link
        href={`/financeiro/${inst.client_id}`}
        className="text-xs flex-shrink-0"
        style={{ color: '#3B82F6' }}
      >
        ver →
      </Link>
    </div>
  )
}

export function FinanceiroPainelClient({
  painel,
  members,
  month,
  year,
  vendedorId,
}: {
  painel: FinanceiroPainel
  members: FinanceiroMember[]
  month: number
  year: number
  vendedorId: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const filteredInstallments = filterBySearch(painel.installments, search, ['client_name'])

  const selectStyle: React.CSSProperties = {
    background: 'var(--theme-input-bg)',
    border: '1px solid var(--theme-input-border)',
    color: 'var(--theme-input-text)',
    borderRadius: 10,
    padding: '7px 12px',
    fontSize: 13,
    outline: 'none',
  }

  function applyFilter(params: { month?: number; year?: number; vendedor?: string }) {
    const newMonth = params.month ?? month
    const newYear = params.year ?? year
    const newVendedor = params.vendedor !== undefined ? params.vendedor : vendedorId
    const qs = new URLSearchParams({ month: String(newMonth), year: String(newYear) })
    if (newVendedor) qs.set('vendedor', newVendedor)
    router.push(`/financeiro?${qs.toString()}`)
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="flex flex-col flex-1 overflow-auto px-6 py-5 gap-5">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={month}
          onChange={(e) => applyFilter({ month: Number(e.target.value) })}
          style={selectStyle}
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => applyFilter({ year: Number(e.target.value) })}
          style={selectStyle}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={vendedorId}
          onChange={(e) => applyFilter({ vendedor: e.target.value })}
          style={selectStyle}
        >
          <option value="">Todos os vendedores</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
          ))}
        </select>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente..." />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card label="Faturamento total" value={painel.faturamento_total} accent="#10B981" />
        <Card label="A receber" value={painel.a_receber} accent="#3B82F6" />
        <Card label="Em atraso" value={painel.em_atraso} accent="#EF4444" />

      </div>

      {/* Lista de parcelas */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
          Parcelas do período ({filteredInstallments.length})
        </p>
        {filteredInstallments.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--theme-text-subtle)' }}>
            Nenhuma parcela no período selecionado.
          </p>
        ) : (
          filteredInstallments.map((inst) => (
            <InstallmentRow key={inst.id} inst={inst} />
          ))
        )}
      </div>
    </div>
  )
}

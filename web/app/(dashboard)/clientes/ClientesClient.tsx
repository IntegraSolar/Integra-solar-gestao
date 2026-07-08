'use client'

import { useState, useMemo, memo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/clients/types'
import type { ClientsFilters, ClientsFilterOptions } from '@/lib/clients/queries'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'
import { FilterBar, FilterField } from '@/components/ui/filters/FilterBar'
import { SelectFilter } from '@/components/ui/filters/SelectFilter'
import { RangeSlider } from '@/components/ui/filters/RangeSlider'

const PrazoBadge = memo(function PrazoBadge({ client }: { client: Client }) {
  const start = client.delivery_start_date ? new Date(client.delivery_start_date) : null
  const max = client.contract_max_days ?? 0
  if (!start || !max) return null

  const dias = Math.floor((Date.now() - start.getTime()) / 86400000)
  const pct = (dias / max) * 100
  const finalizado = client.pipeline_stage === 'concluido' || client.pipeline_stage === 'pos_obra'

  let color = '#10B981'
  let bg = 'rgba(16,185,129,0.12)'
  let border = 'rgba(16,185,129,0.25)'
  if (pct > 100) { color = '#EF4444'; bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.25)' }
  else if (pct >= 80) { color = '#FBBF24'; bg = 'rgba(251,191,36,0.12)'; border = 'rgba(251,191,36,0.25)' }

  return (
    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: bg, color, border: `1px solid ${border}` }}>
      {finalizado ? `${dias} dias` : `${dias} / ${max} dias`}
    </span>
  )
})

const ClientRow = memo(function ClientRow({ client }: { client: Client }) {
  const tabsDone = Object.values(client.completed_tabs).filter(Boolean).length
  const isIncomplete = tabsDone < 6
  return (
    <Link
      href={`/clientes/${client.id}`}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all cursor-pointer"
      style={{ background: 'var(--theme-surface)', border: `1px solid ${isIncomplete ? 'var(--theme-warning)' : 'var(--theme-border)'}` }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)' }}>{client.name}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
          {client.city ?? ''}{client.city && client.phone ? ' · ' : ''}{client.phone ?? ''}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <PrazoBadge client={client} />
        <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>{tabsDone}/8 abas</span>
        {isIncomplete ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--theme-warning)' }}>
            Cadastro pendente
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
            {client.pipeline_stage}
          </span>
        )}
        <span style={{ color: 'var(--theme-text-subtle)' }}>→</span>
      </div>
    </Link>
  )
})

export default function ClientesClient({
  clients,
  total,
  page,
  pageSize,
  filterOptions,
  filters,
}: {
  clients: Client[]
  total: number
  page: number
  pageSize: number
  filterOptions: ClientsFilterOptions
  filters: ClientsFilters
}) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = useMemo(
    () => filterBySearch(clients, search, ['name', 'phone', 'city', 'cpf_cnpj', 'email']),
    [clients, search]
  )
  const totalPages = Math.ceil(total / pageSize)

  const kwpValue: [number, number] = [
    filters.kwpMin ?? filterOptions.kwpBounds[0],
    filters.kwpMax ?? filterOptions.kwpBounds[1],
  ]
  const invPowerValue: [number, number] = [
    filters.inverterPowerMin ?? filterOptions.inverterPowerBounds[0],
    filters.inverterPowerMax ?? filterOptions.inverterPowerBounds[1],
  ]

  const applyFilter = useCallback((patch: Partial<ClientsFilters>) => {
    const next: ClientsFilters = { ...filters, ...patch }
    const sp = new URLSearchParams()
    if (next.city)              sp.set('city', next.city)
    if (next.inverterBrand)     sp.set('inverterBrand', next.inverterBrand)
    if (next.panelBrand)        sp.set('panelBrand', next.panelBrand)
    if (next.origemId)          sp.set('origem', next.origemId)
    if (next.paymentMethod)     sp.set('paymentMethod', next.paymentMethod)
    if (next.kwpMin !== undefined && next.kwpMin !== filterOptions.kwpBounds[0]) sp.set('kwpMin', String(next.kwpMin))
    if (next.kwpMax !== undefined && next.kwpMax !== filterOptions.kwpBounds[1]) sp.set('kwpMax', String(next.kwpMax))
    if (next.inverterPowerMin !== undefined && next.inverterPowerMin !== filterOptions.inverterPowerBounds[0]) sp.set('inverterPowerMin', String(next.inverterPowerMin))
    if (next.inverterPowerMax !== undefined && next.inverterPowerMax !== filterOptions.inverterPowerBounds[1]) sp.set('inverterPowerMax', String(next.inverterPowerMax))
    router.push(`/clientes${sp.toString() ? `?${sp.toString()}` : ''}`)
  }, [filters, filterOptions, router])

  const clearAll = useCallback(() => {
    router.push('/clientes')
  }, [router])

  // Contagem de filtros ativos (para o badge)
  const activeCount = [
    filters.city, filters.inverterBrand, filters.panelBrand, filters.origemId, filters.paymentMethod,
    filters.kwpMin !== undefined && filters.kwpMin !== filterOptions.kwpBounds[0],
    filters.kwpMax !== undefined && filters.kwpMax !== filterOptions.kwpBounds[1],
    filters.inverterPowerMin !== undefined && filters.inverterPowerMin !== filterOptions.inverterPowerBounds[0],
    filters.inverterPowerMax !== undefined && filters.inverterPowerMax !== filterOptions.inverterPowerBounds[1],
  ].filter(Boolean).length

  const advanced = (
    <>
      <FilterField label="Cidade">
        <SelectFilter
          value={filters.city ?? ''}
          onChange={(v) => applyFilter({ city: v || undefined })}
          options={filterOptions.cities.map((c) => ({ value: c, label: c }))}
          placeholder="Todas"
        />
      </FilterField>

      <FilterField label="Origem do cliente">
        <SelectFilter
          value={filters.origemId ?? ''}
          onChange={(v) => applyFilter({ origemId: v || undefined })}
          options={filterOptions.origens.map((o) => ({ value: o.id, label: o.name }))}
          placeholder="Todas"
        />
      </FilterField>

      <FilterField label="Forma de pagamento">
        <SelectFilter
          value={filters.paymentMethod ?? ''}
          onChange={(v) => applyFilter({ paymentMethod: v || undefined })}
          options={filterOptions.paymentMethods.map((p) => ({ value: p, label: p }))}
          placeholder="Todas"
        />
      </FilterField>

      <FilterField label="Marca do inversor">
        <SelectFilter
          value={filters.inverterBrand ?? ''}
          onChange={(v) => applyFilter({ inverterBrand: v || undefined })}
          options={filterOptions.inverterBrands.map((b) => ({ value: b, label: b }))}
          placeholder="Todas"
        />
      </FilterField>

      <FilterField label="Marca dos módulos">
        <SelectFilter
          value={filters.panelBrand ?? ''}
          onChange={(v) => applyFilter({ panelBrand: v || undefined })}
          options={filterOptions.panelBrands.map((b) => ({ value: b, label: b }))}
          placeholder="Todas"
        />
      </FilterField>

      <FilterField label={`Potência do sistema (kWp) — ${kwpValue[0]} a ${kwpValue[1]}`}>
        <RangeSlider
          min={filterOptions.kwpBounds[0]}
          max={filterOptions.kwpBounds[1]}
          step={1}
          value={kwpValue}
          onChange={([lo, hi]) => applyFilter({ kwpMin: lo, kwpMax: hi })}
          unit=" kWp"
        />
      </FilterField>

      <FilterField label={`Potência do inversor (W) — ${invPowerValue[0]} a ${invPowerValue[1]}`}>
        <RangeSlider
          min={filterOptions.inverterPowerBounds[0]}
          max={filterOptions.inverterPowerBounds[1]}
          step={100}
          value={invPowerValue}
          onChange={([lo, hi]) => applyFilter({ inverterPowerMin: lo, inverterPowerMax: hi })}
          unit=" W"
        />
      </FilterField>
    </>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex-shrink-0 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Clientes</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
              {total} clientes {totalPages > 1 ? `· página ${page + 1} de ${totalPages}` : ''}
            </p>
          </div>
        </div>

        <FilterBar activeCount={activeCount} onClear={clearAll} advanced={advanced}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente..." />
        </FilterBar>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm" style={{ color: 'var(--theme-text-subtle)' }}>
              {search || activeCount > 0 ? 'Nenhum cliente encontrado com os filtros aplicados.' : 'Nenhum cliente com cadastro completo ainda.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((client) => <ClientRow key={client.id} client={client} />)}
          </div>
        )}
      </div>

      {!search && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-6 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--theme-border)' }}>
          <button
            onClick={() => {
              const sp = new URLSearchParams(window.location.search)
              sp.set('page', String(page - 1))
              router.push(`/clientes?${sp.toString()}`)
            }}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
            style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
          >
            ← Anterior
          </button>
          <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => {
              const sp = new URLSearchParams(window.location.search)
              sp.set('page', String(page + 1))
              router.push(`/clientes?${sp.toString()}`)
            }}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
            style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}

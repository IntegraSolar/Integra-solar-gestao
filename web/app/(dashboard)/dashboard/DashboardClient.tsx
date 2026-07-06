'use client'

import { useState, useTransition } from 'react'
import { DatePicker } from '@/components/ui/inputs'
import type { PipelineCard, FaturamentoMes, LeadOrigemItem, KpiData, MetaData } from '@/lib/dashboard/queries'
import { getKpiData, getMetaData } from '@/lib/dashboard/actions'
import dynamic from 'next/dynamic'
import PipelineCards from './PipelineCards'
import KpiCards from './KpiCards'
import MetaCard from './MetaCard'

const FaturamentoChart = dynamic(() => import('./FaturamentoChart'), { ssr: false })
const LeadsOrigemChart = dynamic(() => import('./LeadsOrigemChart'), { ssr: false })

export default function DashboardClient({
  pipelineCards,
  faturamento,
  leadsPorOrigem,
  initialKpi,
  initialMeta,
}: {
  pipelineCards: PipelineCard[]
  faturamento: FaturamentoMes[]
  leadsPorOrigem: LeadOrigemItem[]
  initialKpi: KpiData
  initialMeta: MetaData
}) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [kpi, setKpi] = useState(initialKpi)
  const [meta, setMeta] = useState(initialMeta)
  const [isPending, startTransition] = useTransition()

  function handleFilter() {
    startTransition(async () => {
      const from = dateFrom || null
      const to = dateTo || null
      const [newKpi, newMeta] = await Promise.all([
        getKpiData(from, to),
        getMetaData(from, to),
      ])
      setKpi(newKpi)
      setMeta(newMeta)
    })
  }

  function handleClear() {
    setDateFrom('')
    setDateTo('')
    startTransition(async () => {
      const [newKpi, newMeta] = await Promise.all([
        getKpiData(null, null),
        getMetaData(null, null),
      ])
      setKpi(newKpi)
      setMeta(newMeta)
    })
  }

  const inputCls =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'

  return (
    <div className="p-6 space-y-6">
      {/* Header + Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Visao geral operacional</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white/50 text-sm">Período:</span>
          <div style={{ minWidth: 150 }}>
            <DatePicker value={dateFrom} onChange={(iso) => setDateFrom(iso)} />
          </div>
          <span className="text-white/30 text-sm">até</span>
          <div style={{ minWidth: 150 }}>
            <DatePicker value={dateTo} onChange={(iso) => setDateTo(iso)} />
          </div>
          <button
            onClick={handleFilter}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            {isPending ? '...' : 'Aplicar'}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 transition-colors border border-white/10"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Pipeline Cards */}
      <PipelineCards cards={pipelineCards} />

      {/* KPI Cards */}
      <KpiCards kpi={kpi} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FaturamentoChart data={faturamento} />
        </div>
        <div>
          <LeadsOrigemChart data={leadsPorOrigem} />
        </div>
      </div>

      {/* Meta */}
      <MetaCard meta={meta} />
    </div>
  )
}

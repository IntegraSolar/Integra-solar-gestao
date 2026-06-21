import type { Metadata } from 'next'
import {
  getPipelineCards,
  getFaturamentoComparativo,
  getLeadsPorOrigem,
  getKpiData,
  getMetaData,
} from '@/lib/dashboard/queries'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Dashboard — Integra Solar',
}

export default async function DashboardPage() {
  const [pipelineCards, faturamento, leadsPorOrigem, initialKpi, initialMeta] = await Promise.all([
    getPipelineCards(),
    getFaturamentoComparativo(),
    getLeadsPorOrigem(),
    getKpiData(null, null),
    getMetaData(null, null),
  ])

  return (
    <DashboardClient
      pipelineCards={pipelineCards}
      faturamento={faturamento}
      leadsPorOrigem={leadsPorOrigem}
      initialKpi={initialKpi}
      initialMeta={initialMeta}
    />
  )
}

// Funções puras de cálculo do DRE — sem dependências de DB ou servidor.
// Extraídas aqui para permitir testes unitários isolados.

export type DRECalcInput = {
  saleValue: number
  costAmounts: number[]
  commissionPct: number
}

export type DRECalcResult = {
  totalCosts: number
  commission: number
  grossProfit: number
  netProfit: number
  margin: number
}

export function calcDRE(input: DRECalcInput): DRECalcResult {
  const { saleValue, costAmounts, commissionPct } = input
  const totalCosts = costAmounts.reduce((s, c) => s + c, 0)
  const commission = commissionPct > 0 ? saleValue * (commissionPct / 100) : 0
  const grossProfit = saleValue - totalCosts
  const netProfit = grossProfit - commission
  const margin = saleValue > 0 ? (netProfit / saleValue) * 100 : 0
  return { totalCosts, commission, grossProfit, netProfit, margin }
}

export type SummaryProject = {
  id: string
  revenue: number
  costs: number
  profit: number
  margin: number
}

export type DRESummaryCalc = {
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  weightedMargin: number
  mostProfitableId: string | null
  leastProfitableId: string | null
}

export function calcDRESummary(projects: SummaryProject[]): DRESummaryCalc {
  if (projects.length === 0) {
    return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, weightedMargin: 0, mostProfitableId: null, leastProfitableId: null }
  }
  const totalRevenue = projects.reduce((s, p) => s + p.revenue, 0)
  const totalCosts = projects.reduce((s, p) => s + p.costs, 0)
  const totalProfit = projects.reduce((s, p) => s + p.profit, 0)
  const weightedMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const sorted = [...projects].sort((a, b) => b.profit - a.profit)
  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    weightedMargin,
    mostProfitableId: sorted[0]?.id ?? null,
    leastProfitableId: projects.length > 1 ? (sorted[sorted.length - 1]?.id ?? null) : null,
  }
}

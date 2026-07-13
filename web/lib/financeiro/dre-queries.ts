import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type DREData = {
  client: {
    id: string
    name: string
    city: string | null
    pipeline_stage: string
    commission_pct: number | null
    sale_value: number | null
    payment_method: string | null
    contract_date: string | null
  }
  costs: {
    id: string
    description: string
    category: string
    amount: number
    cost_date: string
    notes: string | null
  }[]
  costsByCategory: { category: string; total: number }[]
  totalCosts: number
  grossProfit: number
  commission: number
  netProfit: number
  margin: number
  revenueGross: number
}

export async function getDREByClient(clientId: string): Promise<DREData | null> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return null

  const supabase = await createClient()

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('id, name, city, pipeline_stage, contract_date')
    .eq('id', clientId)
    .eq('organization_id', orgId)
    .single()

  if (!client) return null

  const { data: sale } = await (supabase as any)
    .from('client_sales')
    .select('sale_value, commission_pct, payment_method')
    .eq('client_id', clientId)
    .maybeSingle()

  const { data: costsRaw } = await (supabase as any)
    .from('project_costs')
    .select('id, description, category, amount, cost_date, notes')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .order('cost_date', { ascending: false })

  const costs = (costsRaw ?? []).map((c: any) => ({ ...c, amount: Number(c.amount) }))
  const saleValue = Number(sale?.sale_value ?? 0)
  const commissionPct = Number(sale?.commission_pct ?? 0)
  const totalCosts = costs.reduce((sum: number, c: any) => sum + c.amount, 0)
  const commission = commissionPct > 0 ? saleValue * (commissionPct / 100) : 0
  const grossProfit = saleValue - totalCosts
  const netProfit = grossProfit - commission
  const margin = saleValue > 0 ? (netProfit / saleValue) * 100 : 0

  // Group by category
  const categoryMap: Record<string, number> = {}
  for (const c of costs) {
    categoryMap[c.category] = (categoryMap[c.category] ?? 0) + c.amount
  }
  const costsByCategory = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return {
    client: {
      id: client.id,
      name: client.name,
      city: client.city,
      pipeline_stage: client.pipeline_stage,
      commission_pct: commissionPct,
      sale_value: saleValue,
      payment_method: sale?.payment_method ?? null,
      contract_date: client.contract_date,
    },
    costs,
    costsByCategory,
    totalCosts,
    grossProfit,
    commission,
    netProfit,
    margin,
    revenueGross: saleValue,
  }
}

export type DRESummary = {
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  avgMargin: number
  projectCount: number
  mostProfitable: { name: string; profit: number } | null
  leastProfitable: { name: string; profit: number } | null
  projects: { id: string; name: string; revenue: number; costs: number; profit: number; margin: number }[]
}

export async function getDRESummary(): Promise<DRESummary> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, avgMargin: 0, projectCount: 0, mostProfitable: null, leastProfitable: null, projects: [] }

  const supabase = await createClient()

  const { data: sales } = await (supabase as any)
    .from('client_sales')
    .select('client_id, sale_value, commission_pct, clients!client_id(name)')
    .eq('organization_id', orgId)

  const { data: costsRaw } = await (supabase as any)
    .from('project_costs')
    .select('client_id, amount')
    .eq('organization_id', orgId)

  const costsByClient: Record<string, number> = {}
  for (const c of costsRaw ?? []) {
    costsByClient[c.client_id] = (costsByClient[c.client_id] ?? 0) + Number(c.amount)
  }

  const projects = (sales ?? []).map((s: any) => {
    const revenue = Number(s.sale_value ?? 0)
    const costs = costsByClient[s.client_id] ?? 0
    const commission = revenue * (Number(s.commission_pct ?? 0) / 100)
    const profit = revenue - costs - commission
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    return {
      id: s.client_id,
      name: s.clients?.name ?? '—',
      revenue,
      costs,
      profit,
      margin,
    }
  })

  const totalRevenue = projects.reduce((s: number, p: any) => s + p.revenue, 0)
  const totalCosts = projects.reduce((s: number, p: any) => s + p.costs, 0)
  const totalProfit = projects.reduce((s: number, p: any) => s + p.profit, 0)
  const avgMargin = projects.length > 0
    ? projects.reduce((s: number, p: any) => s + p.margin, 0) / projects.length
    : 0

  const sorted = [...projects].sort((a: any, b: any) => b.profit - a.profit)

  const first = sorted[0] ?? null
  const last = sorted.length > 1 ? sorted[sorted.length - 1] : null

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    avgMargin,
    projectCount: projects.length,
    mostProfitable: first ? { name: first.name, profit: first.profit } : null,
    leastProfitable: last ? { name: last.name, profit: last.profit } : null,
    projects: sorted,
  }
}

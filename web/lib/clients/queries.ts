// web/lib/clients/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import type { Client } from './types'

const CLIENT_SELECT = `
  *,
  sale:client_sale(id, client_id, sale_value, payment_method, nf_notes, commission_pct),
  installments:client_installments(id, client_id, position, due_date, amount, notes, status, payment_proof_url, confirmed_at),
  attachments:client_attachments(id, client_id, type, file_url, uploaded_at),
  contract:client_contracts(id, client_id, contract_url, power_of_attorney_url, signed, signed_at)
`

export const CLIENTS_PAGE_SIZE = 50

export type ClientsFilters = {
  city?: string
  kwpMin?: number
  kwpMax?: number
  inverterBrand?: string
  panelBrand?: string
  inverterPowerMin?: number
  inverterPowerMax?: number
  origemId?: string
  paymentMethod?: string
}

export type ClientsFilterOptions = {
  cities: string[]
  inverterBrands: string[]
  panelBrands: string[]
  origens: { id: string; name: string }[]
  paymentMethods: string[]
  kwpBounds: [number, number]
  inverterPowerBounds: [number, number]
}

/**
 * Lista paginada de clientes com filtros aplicados no banco.
 * O JOIN com `leads` (origem) e `client_sale` (forma de pagamento) usa `!inner`
 * quando o filtro está ativo — Supabase converte em INNER JOIN, filtrando eficientemente.
 */
export async function getClients(
  page = 0,
  filters: ClientsFilters = {},
): Promise<{ clients: Client[]; total: number }> {
  const user = await getCurrentUserData()
  if (!user?.membership) return { clients: [], total: 0 }
  const supabase = await createClient()
  const orgId = user.membership.organization.id
  const from = page * CLIENTS_PAGE_SIZE
  const to = from + CLIENTS_PAGE_SIZE - 1

  // Determina se precisamos de INNER JOIN em leads/sale
  const needsLeadInner = !!filters.origemId
  const needsSaleInner = !!filters.paymentMethod

  const selectStr = `
    *,
    sale:client_sale${needsSaleInner ? '!inner' : ''}(id, client_id, sale_value, payment_method, nf_notes, commission_pct),
    installments:client_installments(id, client_id, position, due_date, amount, notes, status, payment_proof_url, confirmed_at),
    attachments:client_attachments(id, client_id, type, file_url, uploaded_at),
    contract:client_contracts(id, client_id, contract_url, power_of_attorney_url, signed, signed_at)
    ${needsLeadInner ? ',lead:leads!inner(id, lead_source_id)' : ''}
  `

  let query = supabase
    .from('clients')
    .select(selectStr, { count: 'exact' })
    .eq('organization_id', orgId)

  if (filters.city)              query = query.eq('city', filters.city)
  if (filters.inverterBrand)     query = query.eq('inverter_brand', filters.inverterBrand)
  if (filters.panelBrand)        query = query.eq('panel_brand', filters.panelBrand)
  if (filters.kwpMin !== undefined) query = query.gte('system_power_kwp', filters.kwpMin)
  if (filters.kwpMax !== undefined) query = query.lte('system_power_kwp', filters.kwpMax)
  if (filters.inverterPowerMin !== undefined) query = query.gte('inverter_power_w', filters.inverterPowerMin)
  if (filters.inverterPowerMax !== undefined) query = query.lte('inverter_power_w', filters.inverterPowerMax)
  if (filters.origemId)          query = query.eq('lead.lead_source_id', filters.origemId)
  if (filters.paymentMethod)     query = query.eq('sale.payment_method', filters.paymentMethod)

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  return { clients: (data ?? []).map(normalizeClient) as Client[], total: count ?? 0 }
}

/**
 * Coleta valores únicos para popular selects de filtros.
 * Executado no server → dados sempre atualizados sem duplicação.
 */
export async function getClientsFilterOptions(): Promise<ClientsFilterOptions> {
  const user = await getCurrentUserData()
  if (!user?.membership) {
    return {
      cities: [], inverterBrands: [], panelBrands: [], origens: [], paymentMethods: [],
      kwpBounds: [0, 100], inverterPowerBounds: [0, 100000],
    }
  }
  const supabase = await createClient()
  const orgId = user.membership.organization.id

  // Buscar em paralelo
  const [cli, sales, origens] = await Promise.all([
    supabase.from('clients')
      .select('city, inverter_brand, panel_brand, system_power_kwp, inverter_power_w')
      .eq('organization_id', orgId),
    supabase.from('client_sale')
      .select('payment_method, clients!inner(organization_id)')
      .eq('clients.organization_id', orgId),
    supabase.from('lead_sources')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ])

  const rows = (cli.data ?? []) as any[]
  const cities = uniq(rows.map((r) => r.city).filter(Boolean)).sort()
  const inverterBrands = uniq(rows.map((r) => r.inverter_brand).filter(Boolean)).sort()
  const panelBrands = uniq(rows.map((r) => r.panel_brand).filter(Boolean)).sort()
  const paymentMethods = uniq(((sales.data ?? []) as any[]).map((r) => r.payment_method).filter(Boolean)).sort()

  const kwps = rows.map((r) => Number(r.system_power_kwp)).filter((n) => !isNaN(n) && n > 0)
  const invPowers = rows.map((r) => Number(r.inverter_power_w)).filter((n) => !isNaN(n) && n > 0)

  return {
    cities,
    inverterBrands,
    panelBrands,
    origens: (origens.data ?? []) as { id: string; name: string }[],
    paymentMethods,
    kwpBounds: kwps.length ? [Math.floor(Math.min(...kwps)), Math.ceil(Math.max(...kwps))] : [0, 100],
    inverterPowerBounds: invPowers.length ? [Math.floor(Math.min(...invPowers)), Math.ceil(Math.max(...invPowers))] : [0, 100000],
  }
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

// All clients (for selects / navigation after lead conversion)
export async function getAllClients(): Promise<Client[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('id, name, phone, city, pipeline_stage, completed_tabs, delivery_start_date, contract_max_days')
    .eq('organization_id', user.membership.organization.id)
    .order('created_at', { ascending: false })
  return (data ?? []).map(normalizeClient) as Client[]
}

export async function getClientById(id: string): Promise<Client | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('id', id)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeClient(data as any) as Client
}

function normalizeClient(raw: any): Client {
  const saleArr = Array.isArray(raw.sale) ? raw.sale : (raw.sale ? [raw.sale] : [])
  const contractArr = Array.isArray(raw.contract) ? raw.contract : (raw.contract ? [raw.contract] : [])
  return {
    ...raw,
    type: raw.type ?? 'pf',
    specific_panels: raw.specific_panels ?? false,
    specific_inverter: raw.specific_inverter ?? false,
    direct_delivery: raw.direct_delivery ?? false,
    has_adaptation_works: raw.has_adaptation_works ?? false,
    inspection_done: raw.inspection_done ?? false,
    pipeline_stage: raw.pipeline_stage ?? 'crm',
    completed_tabs: (raw.completed_tabs ?? {}) as Record<string, boolean>,
    pipeline_flags: (raw.pipeline_flags ?? {}) as Record<string, unknown>,
    sale: saleArr[0] ?? null,
    installments: Array.isArray(raw.installments) ? raw.installments : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    contract: contractArr[0] ?? null,
  }
}

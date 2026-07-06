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

// Paginated client list. Returns { clients, total }.
export async function getClients(page = 0): Promise<{ clients: Client[]; total: number }> {
  const user = await getCurrentUserData()
  if (!user?.membership) return { clients: [], total: 0 }
  const supabase = await createClient()
  const from = page * CLIENTS_PAGE_SIZE
  const to = from + CLIENTS_PAGE_SIZE - 1
  const { data, count } = await supabase
    .from('clients')
    .select(CLIENT_SELECT, { count: 'exact' })
    .eq('organization_id', user.membership.organization.id)
    .order('created_at', { ascending: false })
    .range(from, to)
  return { clients: (data ?? []).map(normalizeClient) as Client[], total: count ?? 0 }
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
  // Supabase returns 1-to-many as arrays, 1-to-1 FKs also as arrays
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

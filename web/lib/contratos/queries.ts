// web/lib/contratos/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type ContratoClient = {
  id: string
  name: string
  city: string | null
  contract_date: string | null
  pipeline_stage: string
  contract: {
    id: string
    status: string
    signed: boolean
    signed_at: string | null
    contract_url: string | null
    power_of_attorney_url: string | null
  } | null
}

export async function getContratos(): Promise<ContratoClient[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_date, pipeline_stage,
      contract:client_contracts(id, status, signed, signed_at, contract_url, power_of_attorney_url)
    `)
    .eq('organization_id', user.membership.organization.id)
    .eq('pipeline_stage', 'contratos')
    .order('created_at', { ascending: false })
  return ((data ?? []) as any[]).map(normalizeContrato)
}

export async function getContratoById(clientId: string): Promise<ContratoClient | null> {
  const user = await getCurrentUserData()
  if (!user?.membership) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('clients')
    .select(`
      id, name, city, contract_date, pipeline_stage,
      contract:client_contracts(id, status, signed, signed_at, contract_url, power_of_attorney_url)
    `)
    .eq('id', clientId)
    .eq('organization_id', user.membership.organization.id)
    .single()
  if (!data) return null
  return normalizeContrato(data as any)
}

function normalizeContrato(raw: any): ContratoClient {
  const contractArr = Array.isArray(raw.contract)
    ? raw.contract
    : raw.contract
    ? [raw.contract]
    : []
  return {
    id: raw.id,
    name: raw.name,
    city: raw.city ?? null,
    contract_date: raw.contract_date ?? null,
    pipeline_stage: raw.pipeline_stage ?? 'contratos',
    contract: contractArr[0] ?? null,
  }
}

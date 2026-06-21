// web/lib/configuracoes/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type OrgConfig = {
  id: string | null
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  email: string | null
  telefone: string | null
  cep: string | null
  endereco: string | null
  bairro: string | null
  numero: string | null
  cidade: string | null
  estado: string | null
  cor_principal: string | null
  cor_secundaria: string | null
  concessionaria: string | null
  logo_url: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo_chave_pix: string | null
  pix: string | null
  kwh_por_kwp: number | null
  valor_projeto_por_kwp: number | null
  valor_instalacao_por_placa: number | null
  pct_material_ca: number | null
  quilometragem: number | null
  pct_comissao: number | null
  pct_imposto: number | null
  pct_margem: number | null
  meta_anual: number | null
}

export type LeadOrigin = {
  id: string
  name: string
}

function emptyConfig(): OrgConfig {
  return {
    id: null, razao_social: null, nome_fantasia: null, cnpj: null,
    email: null, telefone: null, cep: null, endereco: null, bairro: null,
    numero: null, cidade: null, estado: null, cor_principal: '#FFD080',
    cor_secundaria: '#0a0e1a', concessionaria: null, logo_url: null,
    banco: null, agencia: null, conta: null, tipo_chave_pix: null, pix: null,
    kwh_por_kwp: null, valor_projeto_por_kwp: null, valor_instalacao_por_placa: null,
    pct_material_ca: null, quilometragem: null, pct_comissao: null,
    pct_imposto: null, pct_margem: null, meta_anual: null,
  }
}

export async function getOrgConfig(): Promise<OrgConfig> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return emptyConfig()

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('org_config')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!data) return emptyConfig()
  return data as OrgConfig
}

export async function getLeadOrigins(): Promise<LeadOrigin[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('lead_sources')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  return (data ?? []) as LeadOrigin[]
}

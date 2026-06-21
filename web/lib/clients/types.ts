// web/lib/clients/types.ts

export type ClientType = 'pf' | 'pj'

export type ClientSale = {
  id: string
  client_id: string
  sale_value: number
  payment_method: string | null
  nf_notes: string | null
  commission_pct: number
}

export type ClientInstallment = {
  id: string
  client_id: string
  position: number
  due_date: string
  amount: number
  notes: string | null
  status: 'pendente' | 'confirmada'
  payment_proof_url: string | null
  confirmed_at: string | null
}

export type ClientAttachment = {
  id: string
  client_id: string
  type: string
  file_url: string
  uploaded_at: string
}

export type ClientContract = {
  id: string
  client_id: string
  contract_url: string | null
  power_of_attorney_url: string | null
  signed: boolean
  signed_at: string | null
}

export type Client = {
  id: string
  organization_id: string
  lead_id: string | null
  // Aba 1
  type: ClientType
  name: string
  cpf_cnpj: string | null
  email: string | null
  phone: string | null
  zip: string | null
  street: string | null
  number: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  // Aba 2
  promised_kwh: number | null
  system_power_kwp: number | null
  panel_brand: string | null
  panel_power_w: number | null
  inverter_brand: string | null
  inverter_power_w: number | null
  specific_panels: boolean
  specific_inverter: boolean
  direct_delivery: boolean
  viability_proposal_id: string | null
  // Aba 4
  has_adaptation_works: boolean
  roof_type: string | null
  roof_orientation: string | null
  maps_coordinates: string | null
  entry_breaker: string | null
  entry_cable_mm: string | null
  inspection_done: boolean
  client_notes: string | null
  extra_promises: string | null
  // Aba 5
  delivery_start_date: string | null
  contract_date: string | null
  contract_max_days: number | null
  // Pipeline
  pipeline_stage: string
  completed_tabs: Record<string, boolean>
  pipeline_flags: Record<string, unknown>
  // Related
  sale: ClientSale | null
  installments: ClientInstallment[]
  attachments: ClientAttachment[]
  contract: ClientContract | null
  created_at: string
  updated_at: string | null
}

export type ActionResult = {
  error?: string
  success?: string
}

export const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  procuracao: 'Procuração',
  conta_luz: 'Conta de Luz',
  rg_cnh: 'RG / CNH',
  foto_disjuntor: 'Foto do Disjuntor',
  foto_maps: 'Foto Maps',
  foto_frente: 'Foto da Frente',
  proposta_formalizada: 'Proposta Formalizada',
  cotacao_material: 'Cotação de Material',
}

export const ATTACHMENT_TYPES = Object.keys(ATTACHMENT_TYPE_LABELS)

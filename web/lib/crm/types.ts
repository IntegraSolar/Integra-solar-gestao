// web/lib/crm/types.ts

export type FunnelStage = {
  id: string
  organization_id: string
  name: string
  order: number
  color: string
  is_final_stage: boolean
  is_terminal_won: boolean
  is_terminal_lost: boolean
}

export type LeadSource = {
  id: string
  name: string
}

export type LeadUser = {
  id: string
  full_name: string | null
  email: string
}

export type LeadNote = {
  id: string
  lead_id: string
  content: string
  created_at: string
  created_by: string | null
  author: { full_name: string | null; email: string } | null
}

export type LeadFollowUp = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  completed_at: string | null
  assigned_to_user_id: string | null
}

export type Lead = {
  id: string
  organization_id: string
  name: string
  phone: string | null
  city: string | null
  address: string | null
  avg_kwh: number | null
  installation_type: string | null
  // Pre-existing DB fields (kept for completeness)
  system_type: string | null
  estimated_kwp: number | null
  estimated_value: number | null
  observations: string | null
  next_action_date: string | null
  converted: boolean
  converted_to_client_id: string | null
  created_at: string
  updated_at: string
  current_stage_id: string
  assigned_to_user_id: string | null
  stage: FunnelStage | null
  assigned_user: LeadUser | null
  lead_source: LeadSource | null
  notes: LeadNote[]
  followups: LeadFollowUp[]
}

export type Supplier = {
  id: string
  name: string
}

export type ProposalTemplate = {
  id: string
  org_id: string
  name: string
  category: string | null
  file_path: string
  is_default: boolean
  is_active: boolean
  created_at: string
}

export type Proposal = {
  id: string
  lead_id: string | null
  name: string
  panel_qty: number
  panel_power_w: number
  panel_brand_model: string | null
  inverter_qty: number
  inverter_power_w: number
  inverter_brand_model: string | null
  kit_value: number
  km_rodados: number
  total_power_kwp: number
  monthly_generation_kwh: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  supplier: Supplier | null
  // Campos financeiros
  template_id: string | null
  preco_total: number | null
  custo_kit: number | null
  custo_projeto: number | null
  custo_instalacao: number | null
  custo_km: number | null
  custo_ca: number | null
  valor_entrada: number | null
  valor_parcelas: number | null
  num_parcelas: number | null
  pdf_url: string | null
  docx_url: string | null
  gerado_em: string | null
  pricing_overrides: {
    valor_instalacao_por_placa?: number
    valor_projeto_por_kwp?: number
    pct_material_ca?: number
    quilometragem?: number
    pct_comissao?: number
    pct_imposto?: number
    pct_margem?: number
  } | null
  // Ajuste Comercial
  preco_calculado:      number | null
  ajuste_tipo:          'percentual' | 'valor' | 'valor_final' | null
  ajuste_valor:         number | null
  ajuste_percentual:    number | null
  ajuste_motivo:        string | null
  ajuste_aplicado_por:  string | null
  ajuste_aplicado_em:   string | null
  preco_final:          number | null
}

export type ActionResult = {
  error?: string
  success?: string
}

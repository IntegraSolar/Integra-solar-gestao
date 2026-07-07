import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, formatPhone } from '@/lib/format'

export type PlaceholderData = {
  cliente_nome: string
  cliente_cidade: string
  cliente_telefone: string
  empresa_nome: string
  empresa_cnpj: string
  empresa_telefone: string
  paineis_qtd: string
  paineis_potencia: string
  paineis_marca: string
  inversor_qtd: string
  inversor_potencia: string
  inversor_marca: string
  total_kwp: string
  geracao_mensal: string
  preco_total: string
  preco_calculado: string
  ajuste_valor: string
  ajuste_pct: string
  preco_final: string
  valor_entrada: string
  num_parcelas: string
  valor_parcelas: string
  data_proposta: string
  validade_proposta: string
}

type LeadData = {
  name: string
  city: string | null
  phone: string | null
}

type OrgData = {
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  telefone: string | null
}

type ProposalData = {
  panel_qty: number
  panel_power_w: number
  panel_brand_model: string | null
  inverter_qty: number
  inverter_power_w: number
  inverter_brand_model: string | null
  total_power_kwp: number
  monthly_generation_kwh: number
  preco_total: number
  preco_calculado: number
  ajuste_valor: number | null
  ajuste_percentual: number | null
  preco_final: number
  valor_entrada: number
  num_parcelas: number
  valor_parcelas: number
}

export function buildPlaceholders(
  lead: LeadData,
  org: OrgData,
  proposal: ProposalData
): PlaceholderData {
  const today = new Date()
  const fmt = (d: Date) => format(d, 'dd/MM/yyyy', { locale: ptBR })

  return {
    cliente_nome:      lead.name,
    cliente_cidade:    lead.city ?? '',
    cliente_telefone:  lead.phone ? formatPhone(lead.phone) : '',
    empresa_nome:      org.nome_fantasia ?? org.razao_social ?? '',
    empresa_cnpj:      org.cnpj ?? '',
    empresa_telefone:  org.telefone ? formatPhone(org.telefone) : '',
    paineis_qtd:       String(proposal.panel_qty),
    paineis_potencia:  `${proposal.panel_power_w}W`,
    paineis_marca:     proposal.panel_brand_model ?? '',
    inversor_qtd:      String(proposal.inverter_qty),
    inversor_potencia: `${proposal.inverter_power_w}W`,
    inversor_marca:    proposal.inverter_brand_model ?? '',
    total_kwp:         `${proposal.total_power_kwp.toFixed(2)} kWp`,
    geracao_mensal:    `${Math.round(proposal.monthly_generation_kwh)} kWh`,
    preco_total:       formatCurrency(proposal.preco_final),
    preco_calculado:   formatCurrency(proposal.preco_calculado),
    ajuste_valor:      proposal.ajuste_valor != null
      ? `${proposal.ajuste_valor >= 0 ? '+' : ''}${formatCurrency(proposal.ajuste_valor)}`
      : '',
    ajuste_pct:        proposal.ajuste_percentual != null
      ? `${proposal.ajuste_percentual >= 0 ? '+' : ''}${(proposal.ajuste_percentual * 100).toFixed(2)}%`
      : '',
    preco_final:       formatCurrency(proposal.preco_final),
    valor_entrada:     formatCurrency(proposal.valor_entrada),
    num_parcelas:      String(proposal.num_parcelas),
    valor_parcelas:    formatCurrency(proposal.valor_parcelas),
    data_proposta:     fmt(today),
    validade_proposta: fmt(addDays(today, 15)),
  }
}

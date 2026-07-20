// web/lib/apresentacoes/dados.ts
import { format, addDays } from 'date-fns'
import { formatCurrency } from '@/lib/format'
import type { ApresentacaoData } from './tipos'

const VALIDADE_DIAS = 15
const COR_PADRAO = '#10B981'
const COR_SECUNDARIA_PADRAO = '#1A3A5C'

export type ApresentacaoRaw = {
  proposta: {
    name: string | null
    panel_qty: number
    panel_power_w: number
    panel_brand_model: string | null
    inverter_qty: number
    inverter_power_w: number
    inverter_brand_model: string | null
    total_power_kwp: number
    monthly_generation_kwh: number
    preco_final: number
    gerado_em: string
  }
  lead: { name: string; city: string | null; phone: string | null }
  org: {
    nome_fantasia: string | null
    razao_social: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    cidade: string | null
    cor_principal: string | null
    cor_secundaria: string | null
    logo_url: string | null
  }
}

function nf(v: number, casas = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function montarApresentacao(raw: ApresentacaoRaw): ApresentacaoData {
  const { proposta, lead, org } = raw
  const emitida = new Date(proposta.gerado_em)

  const marcaPainel = proposta.panel_brand_model?.trim() || 'Painéis solares'
  const marcaInversor = proposta.inverter_brand_model?.trim() || 'Inversor'
  const potenciaPainel = `${nf(proposta.panel_power_w)} W`
  const potenciaInversor = `${nf(proposta.inverter_power_w / 1000)} kW`

  return {
    titulo: proposta.name?.trim() || 'Proposta Comercial',
    empresa: {
      nome: org.nome_fantasia?.trim() || org.razao_social?.trim() || 'Empresa',
      cnpj: org.cnpj,
      telefone: org.telefone,
      email: org.email,
      cidade: org.cidade,
      logo_url: org.logo_url,
    },
    cliente: { nome: lead.name, cidade: lead.city },
    sistema: {
      paineis: `${proposta.panel_qty}x ${marcaPainel} — ${potenciaPainel}`,
      inversores: `${proposta.inverter_qty}x ${marcaInversor} — ${potenciaInversor}`,
      potencia_kwp: `${nf(proposta.total_power_kwp, 2)} kWp`,
      geracao_mensal: `${nf(proposta.monthly_generation_kwh)} kWh/mês`,
    },
    equipamentos: {
      paineis: {
        marca: marcaPainel,
        quantidade: String(proposta.panel_qty),
        potencia: potenciaPainel,
      },
      inversores: {
        marca: marcaInversor,
        quantidade: String(proposta.inverter_qty),
        potencia: potenciaInversor,
      },
    },
    investimento: { valor: formatCurrency(proposta.preco_final) },
    datas: {
      emitida_em: format(emitida, 'dd/MM/yyyy'),
      valida_ate: format(addDays(emitida, VALIDADE_DIAS), 'dd/MM/yyyy'),
    },
    tema: {
      cor_principal: org.cor_principal?.trim() || COR_PADRAO,
      cor_secundaria: org.cor_secundaria?.trim() || COR_SECUNDARIA_PADRAO,
    },
  }
}

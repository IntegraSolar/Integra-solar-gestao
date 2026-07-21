// web/lib/apresentacoes/dados.ts
import { format, addDays } from 'date-fns'
import { formatCurrency } from '@/lib/format'
import type { ApresentacaoData } from './tipos'
import { corLegivelSobreClaro } from './contraste'

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
    estado: string | null
    endereco: string | null
    bairro: string | null
    numero: string | null
    cor_principal: string | null
    cor_secundaria: string | null
    logo_url: string | null
  }
  depoimentos: { autor: string; cidade: string | null; texto: string }[]
}

/**
 * Monta "Rua X, 123 — Bairro, Cidade/UF", omitindo as partes ausentes sem
 * deixar vírgulas soltas ou traços órfãos. Retorna null quando não há nada.
 */
function montarEnderecoResumido(org: ApresentacaoRaw['org']): string | null {
  const rua = org.endereco?.trim() || null
  const numero = org.numero?.trim() || null
  const bairro = org.bairro?.trim() || null
  const cidade = org.cidade?.trim() || null
  const estado = org.estado?.trim() || null

  const ruaComNumero = [rua, numero].filter(Boolean).join(', ') || null
  const cidadeComEstado = [cidade, estado].filter(Boolean).join('/') || null
  const bairroECidade = [bairro, cidadeComEstado].filter(Boolean).join(', ') || null

  const partes = [ruaComNumero, bairroECidade].filter(Boolean)
  return partes.length > 0 ? partes.join(' — ') : null
}

function nf(v: number, casas = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function montarApresentacao(raw: ApresentacaoRaw): ApresentacaoData {
  const { proposta, lead, org } = raw
  const emitida = new Date(proposta.gerado_em)

  const marcaPainel = proposta.panel_brand_model?.trim() || 'Painéis solares'
  const marcaInversor = proposta.inverter_brand_model?.trim() || 'Inversor'

  const potenciaPainel = proposta.panel_power_w > 0 ? `${nf(proposta.panel_power_w)} W` : null

  // 22 propostas antigas gravaram kW num campo que o resto do sistema trata como
  // W (ProposalForm grava kW * 1000). Dividir esses valores por 1000 daria "0 kW"
  // na frente do cliente final — melhor omitir a potência do que informar errado.
  const inversorEmWatts = proposta.inverter_power_w >= 100
  const potenciaInversor = inversorEmWatts ? `${nf(proposta.inverter_power_w / 1000)} kW` : null

  // Proposta sem orçamento gerado não tem preço: "R$ 0,00" seria pior que nada.
  const temPreco = proposta.preco_final > 0

  return {
    titulo: proposta.name?.trim() || 'Proposta Comercial',
    empresa: {
      nome: org.nome_fantasia?.trim() || org.razao_social?.trim() || 'Empresa',
      razao_social: org.razao_social,
      cnpj: org.cnpj,
      telefone: org.telefone,
      email: org.email,
      cidade: org.cidade,
      logo_url: org.logo_url,
      endereco_resumido: montarEnderecoResumido(org),
    },
    depoimentos: raw.depoimentos,
    cliente: { nome: lead.name, cidade: lead.city },
    sistema: {
      paineis: [`${proposta.panel_qty}x ${marcaPainel}`, potenciaPainel].filter(Boolean).join(' — '),
      inversores: [`${proposta.inverter_qty}x ${marcaInversor}`, potenciaInversor].filter(Boolean).join(' — '),
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
    investimento: { valor: temPreco ? formatCurrency(proposta.preco_final) : null },
    datas: {
      emitida_em: format(emitida, 'dd/MM/yyyy'),
      valida_ate: format(addDays(emitida, VALIDADE_DIAS), 'dd/MM/yyyy'),
    },
    tema: {
      // cor_principal pinta áreas amplas (fundos, barras), onde a cor original
      // funciona. cor_texto é a variante legível, usada nos números em destaque
      // sobre card claro — sem ela, uma empresa de cor clara fica ilegível.
      cor_principal: org.cor_principal?.trim() || COR_PADRAO,
      cor_texto: corLegivelSobreClaro(org.cor_principal?.trim() || COR_PADRAO),
      cor_secundaria: org.cor_secundaria?.trim() || COR_SECUNDARIA_PADRAO,
    },
  }
}

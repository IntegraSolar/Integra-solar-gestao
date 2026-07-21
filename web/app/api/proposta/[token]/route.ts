import { NextResponse } from 'next/server'
import { guardPublicToken } from '@/lib/security/rate-policies'
import { createAdminClient } from '@/lib/supabase/admin'
import { montarApresentacao } from '@/lib/apresentacoes/dados'
import { normalizarConfig } from '@/lib/apresentacoes/tipos'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const blocked = await guardPublicToken('proposta')
  if (blocked) return blocked

  const supabase = createAdminClient()

  const { data: link } = await (supabase as any)
    .from('proposal_links')
    .select('proposal_id, organization_id')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  }

  const { data: proposal } = await (supabase as any)
    .from('proposals')
    .select(`
      name, lead_id,
      total_modules, module_power_wp, panel_brand_model,
      total_inverters, inverter_power_w, inverter_brand_model,
      total_power_kwp, monthly_generation_kwh,
      preco_final, preco_total, gerado_em
    `)
    .eq('id', link.proposal_id)
    .eq('organization_id', link.organization_id)
    .maybeSingle()

  if (!proposal) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  const [leadRes, orgRes] = await Promise.all([
    (supabase as any)
      .from('leads')
      .select('name, city, phone')
      .eq('id', proposal.lead_id)
      .maybeSingle(),
    (supabase as any)
      .from('org_config')
      .select(
        'nome_fantasia, razao_social, cnpj, telefone, email, cidade, estado, endereco, bairro, numero, cor_principal, cor_secundaria, logo_url'
      )
      .eq('organization_id', link.organization_id)
      .maybeSingle(),
  ])

  const lead = leadRes.data
  const org = orgRes.data

  if (!lead) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  // Configuração da apresentação: tabela pode ainda não existir em produção
  // (migration não aplicada). Qualquer erro aqui não pode derrubar a rota
  // pública — cfg fica undefined e normalizarConfig(null) aplica os padrões.
  let cfg: { template?: unknown; tema?: unknown; blocos?: unknown } | null = null
  try {
    const { data } = await (supabase as any)
      .from('proposal_presentations')
      .select('template, tema, blocos')
      .eq('proposal_id', link.proposal_id)
      .maybeSingle()
    cfg = data ?? null
  } catch {
    cfg = null
  }

  // Padrão da empresa (Configurações → Apresentação): textos personalizados e,
  // quando a proposta não tem configuração própria, template/tema/blocos.
  // Mesma proteção das demais: tabela ausente não pode derrubar a rota pública.
  let orgCfg: {
    template?: unknown
    tema?: unknown
    blocos?: unknown
    textos?: unknown
  } | null = null
  try {
    const { data } = await (supabase as any)
      .from('org_apresentacao_config')
      .select('template, tema, blocos, textos')
      .eq('organization_id', link.organization_id)
      .maybeSingle()
    orgCfg = data ?? null
  } catch {
    orgCfg = null
  }

  // Depoimentos: tabela pode ainda não existir em produção (migration não
  // aplicada). Qualquer erro aqui não pode derrubar a rota pública.
  let depoimentos: { autor: string; cidade: string | null; texto: string }[] = []
  try {
    const { data } = await (supabase as any)
      .from('org_depoimentos')
      .select('autor, cidade, texto')
      .eq('organization_id', link.organization_id)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .limit(3)
    depoimentos = (data ?? []).map((d: any) => ({
      autor: d.autor,
      cidade: d.cidade ?? null,
      texto: d.texto,
    }))
  } catch {
    depoimentos = []
  }

  return NextResponse.json({
    dados: montarApresentacao({
      proposta: {
        name: proposal.name ?? null,
        panel_qty: Number(proposal.total_modules ?? 0),
        panel_power_w: Number(proposal.module_power_wp ?? 0),
        panel_brand_model: proposal.panel_brand_model ?? null,
        inverter_qty: Number(proposal.total_inverters ?? 0),
        inverter_power_w: Number(proposal.inverter_power_w ?? 0),
        inverter_brand_model: proposal.inverter_brand_model ?? null,
        total_power_kwp: Number(proposal.total_power_kwp ?? 0),
        monthly_generation_kwh: Number(proposal.monthly_generation_kwh ?? 0),
        preco_final: Number(proposal.preco_final ?? proposal.preco_total ?? 0),
        gerado_em: proposal.gerado_em ?? new Date().toISOString(),
      },
      lead: {
        name: lead.name,
        city: lead.city ?? null,
        phone: lead.phone ?? null,
      },
      org: {
        nome_fantasia: org?.nome_fantasia ?? null,
        razao_social: org?.razao_social ?? null,
        cnpj: org?.cnpj ?? null,
        telefone: org?.telefone ?? null,
        email: org?.email ?? null,
        cidade: org?.cidade ?? null,
        estado: org?.estado ?? null,
        endereco: org?.endereco ?? null,
        bairro: org?.bairro ?? null,
        numero: org?.numero ?? null,
        cor_principal: org?.cor_principal ?? null,
        cor_secundaria: org?.cor_secundaria ?? null,
        logo_url: org?.logo_url ?? null,
      },
      depoimentos,
      textos: orgCfg?.textos,
    }),
    // Configuração da proposta vence a da empresa; sem nenhuma das duas,
    // normalizarConfig aplica os padrões do sistema.
    config: normalizarConfig(cfg ?? orgCfg),
  })
}

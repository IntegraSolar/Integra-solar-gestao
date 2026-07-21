import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { calcularPreco } from '@/lib/proposals/pricing'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { acquireSlot } from '@/lib/security/concurrency'
import { logSecurityEvent } from '@/lib/security/rate-policies'
import { logger } from '@/lib/logger'

const CONVERT_TIMEOUT_MS = 90_000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let releaseSlot: (() => Promise<void>) | null = null
  try {
    await params // params not used in this handler (proposalId comes from body)
    const body = await req.json() as {
      proposalId: string
      template?: string
      tema?: string
      overrides?: {
        valor_instalacao_por_placa?: number
        valor_projeto_por_kwp?: number
        pct_material_ca?: number
        quilometragem?: number
        pct_comissao?: number
        pct_imposto?: number
        pct_margem?: number
      }
      extras?: Array<{
        categoria: string
        item: string
        qtd: number
        custo_unit: number
      }>
      ajuste_comercial?: {
        ajuste_tipo: string
        ajuste_valor: number
        ajuste_percentual: number
        ajuste_motivo: string
        preco_calculado: number
        preco_final: number
      } | null
    }

    const ajuste_comercial: {
      ajuste_tipo: string
      ajuste_valor: number
      ajuste_percentual: number
      ajuste_motivo: string
      preco_calculado: number
      preco_final: number
    } | null = body.ajuste_comercial ?? null

    const { proposalId, template, tema, overrides, extras } = body

    if (!proposalId) return NextResponse.json({ error: 'proposalId é obrigatório.' }, { status: 400 })

    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    // 5 gerações por minuto por organização
    if (!await rateLimit(`generate:${orgId}`, 5, 60_000)) return rateLimitResponse()

    // Limite de CONCORRÊNCIA: no máx. 2 gerações simultâneas por organização
    // (operação pesada — conversão externa de até 90s). Evita exaustão de recursos.
    const slot = await acquireSlot(`pdf-concurrency:${orgId}`, 2, 120)
    if (!slot.ok) {
      logSecurityEvent('pdf_concurrency_blocked', { org: orgId.slice(0, 8) })
      return NextResponse.json(
        { error: 'Muitas gerações de PDF em andamento. Aguarde concluir e tente novamente.' },
        { status: 429, headers: { 'Retry-After': '30' } },
      )
    }
    releaseSlot = slot.release

    const supabase = await createClient()

    const { data: rawProposal } = await (supabase as any)
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('organization_id', orgId)
      .single()

    if (!rawProposal) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 })
    const p = rawProposal as any

    const { data: lead } = await supabase
      .from('leads')
      .select('name, city, phone')
      .eq('id', p.lead_id)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 })

    // Reutiliza orgId já obtido em getCurrentUserData() — evita segunda chamada redundante
    const orgConfig = await getOrgConfig(orgId)

    // Mescla os valores editados pelo usuário sobre a config global.
    // orgConfig serve apenas como fallback — os overrides têm precedência absoluta.
    const effectiveConfig = { ...orgConfig, ...(overrides ?? {}) }

    const pricing = calcularPreco(
      {
        kit_value: p.kit_value ?? 0,
        total_power_kwp: p.total_power_kwp ?? 0,
        panel_qty: p.total_modules ?? 0,
        km_rodados: p.km_rodados ?? 0,
      },
      effectiveConfig
    )

    // Calcula a contribuição dos custos extras adicionados pelo usuário,
    // usando o mesmo divisor (imposto + margem + comissão) da proposta.
    const pct_imposto  = (effectiveConfig.pct_imposto  ?? 0) / 100
    const pct_margem   = (effectiveConfig.pct_margem   ?? 0) / 100
    const pct_comissao = (effectiveConfig.pct_comissao ?? 0) / 100
    const divisor = 1 - pct_imposto - pct_margem - pct_comissao
    const d = divisor > 0 ? divisor : 1
    const extrasVenda = (extras ?? []).reduce((sum, ec) => sum + (ec.qtd * ec.custo_unit) / d, 0)
    const preco_total_final = pricing.preco_total + extrasVenda

    // preco_total_final é o valor calculado ANTES do ajuste comercial
    const preco_calculado_final = preco_total_final
    // Se há ajuste comercial, usa o preco_final negociado; caso contrário usa o calculado
    const preco_final = ajuste_comercial ? ajuste_comercial.preco_final : preco_calculado_final

    // A apresentacao vive num link publico: nao ha mais DOCX, ConvertAPI nem
    // arquivo intermediario. Garantimos o link (reaproveitando o ativo, se houver)
    // e a configuracao da apresentacao.
    let token: string | null = null
    const { data: linkAtivo } = await (supabase as any)
      .from('proposal_links')
      .select('token')
      .eq('proposal_id', proposalId)
      .eq('organization_id', orgId)
      .eq('active', true)
      .maybeSingle()

    if (linkAtivo?.token) {
      token = linkAtivo.token
    } else {
      const novoToken = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      const { error: linkError } = await (supabase as any)
        .from('proposal_links')
        .insert({ proposal_id: proposalId, organization_id: orgId, token: novoToken })
      if (linkError) {
        logger.error('proposals/generate', 'Erro ao criar link da apresentacao', linkError, { proposalId })
        return NextResponse.json(
          { error: 'Orçamento calculado, mas não foi possível criar o link.', step: 'link' },
          { status: 500 }
        )
      }
      token = novoToken
    }

    // Template e tema da apresentacao. Sem blocos: lista vazia significa
    // "usar os blocos do template escolhido".
    if (template || tema) {
      try {
        await (supabase as any).from('proposal_presentations').upsert(
          {
            proposal_id: proposalId,
            organization_id: orgId,
            ...(template ? { template } : {}),
            ...(tema ? { tema } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'proposal_id' }
        )
      } catch (cfgErr: any) {
        // Sem configuracao, a apresentacao usa os padroes — nao vale falhar aqui.
        logger.error('proposals/generate', 'Erro ao salvar configuracao da apresentacao', cfgErr, { proposalId })
      }
    }

    await supabase.from('proposals').update({
      preco_total: preco_total_final,
      preco_calculado: preco_calculado_final,
      preco_final: preco_final,
      custo_kit: pricing.custo_kit,
      custo_projeto: pricing.custo_projeto,
      custo_instalacao: pricing.custo_instalacao,
      custo_km: pricing.custo_km,
      custo_ca: pricing.custo_ca,
      pricing_overrides: overrides ?? null,
      gerado_em: new Date().toISOString(),
      ...(ajuste_comercial ? {
        ajuste_tipo:       ajuste_comercial.ajuste_tipo,
        ajuste_valor:      ajuste_comercial.ajuste_valor,
        ajuste_percentual: ajuste_comercial.ajuste_percentual,
        ajuste_motivo:     ajuste_comercial.ajuste_motivo || null,
      } : {}),
    } as any).eq('id', proposalId)

    return NextResponse.json({
      token,
      apresentacao_path: `/proposta/${token}`,
      preco_final,
    })

  } catch (err: any) {
    logger.error('proposals/generate', 'Erro interno inesperado', err)
    return NextResponse.json({ error: 'Erro interno ao gerar proposta.', step: 'unknown' }, { status: 500 })
  } finally {
    if (releaseSlot) await releaseSlot()
  }
}

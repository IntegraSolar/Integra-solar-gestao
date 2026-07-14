import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { calcularPreco } from '@/lib/proposals/pricing'
import { buildPlaceholders } from '@/lib/proposals/placeholders'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { acquireSlot } from '@/lib/security/concurrency'
import { logSecurityEvent } from '@/lib/security/rate-policies'
import { logger } from '@/lib/logger'

const CONVERT_TIMEOUT_MS = 90_000

/**
 * Sanitize and replace placeholders in DOCX XML in one pass.
 * Word fragments {{tag}} across multiple <w:r> runs. This function:
 * 1. Finds each {{ in text content
 * 2. Scans forward collecting text (skipping XML tags) until }} or }
 * 3. If the collected text is a known placeholder, replaces inline
 * 4. Clears the original {{ }} characters from their text nodes
 */
function processDocxPlaceholders(zip: PizZip, data: Record<string, string>): void {
  for (const fileName of Object.keys(zip.files)) {
    if (!fileName.endsWith('.xml') || zip.files[fileName].dir) continue
    let content = zip.files[fileName].asText()
    if (!content.includes('{{')) continue
    let changed = false
    let i = 0

    while (i < content.length) {
      const openIdx = content.indexOf('{{', i)
      if (openIdx === -1) break

      // Skip if inside an XML tag attribute
      const prevClose = content.lastIndexOf('>', openIdx)
      const prevOpen = content.lastIndexOf('<', openIdx)
      if (prevOpen > prevClose) { i = openIdx + 2; continue }

      // Collect text positions: each entry is [startInContent, endInContent, textContent]
      type TextSpan = { start: number; end: number; text: string }
      const textSpans: TextSpan[] = []
      let j = openIdx
      let textBuf = ''
      let found = false
      const limit = Math.min(openIdx + 3000, content.length)

      while (j < limit) {
        if (content[j] === '<') {
          const closeAngle = content.indexOf('>', j)
          if (closeAngle === -1) break
          j = closeAngle + 1
          continue
        }
        // Start of a text segment
        const textStart = j
        while (j < limit && content[j] !== '<') {
          textBuf += content[j]
          j++
          if (textBuf.endsWith('}}')) { found = true; break }
        }
        textSpans.push({ start: textStart, end: j, text: content.substring(textStart, j) })
        if (found) break
      }

      // Handle single-brace closing
      if (!found) {
        const sm = textBuf.match(/^\{\{([a-z_][a-z0-9_]*)\}$/i)
        if (sm) { found = true; textBuf += '}' }
      }

      if (!found) { i = openIdx + 2; continue }

      const match = textBuf.match(/^\{\{([a-z_][a-z0-9_]*)\}\}$/i)
      if (!match) { i = openIdx + 2; continue }

      const tag = match[1]
      const value = data[tag]
      if (value === undefined) { i = openIdx + 2; continue }

      const escaped = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

      // Replace: put the value in the first text span, clear the rest
      // Work backwards to preserve indices
      for (let k = textSpans.length - 1; k >= 0; k--) {
        const span = textSpans[k]
        if (k === 0) {
          // First span: replace with the value
          content = content.substring(0, span.start) + escaped + content.substring(span.end)
        } else {
          // Other spans: clear them
          content = content.substring(0, span.start) + content.substring(span.end)
        }
      }

      changed = true
      i = textSpans[0].start + escaped.length
    }

    if (changed) zip.file(fileName, content)
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let releaseSlot: (() => Promise<void>) | null = null
  try {
    await params // params not used in this handler (proposalId comes from body)
    const body = await req.json() as {
      proposalId: string
      templateId: string
      valor_entrada: number
      valor_parcelas: number
      num_parcelas: number
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

    const { proposalId, templateId, valor_entrada, valor_parcelas, num_parcelas, overrides, extras } = body

    if (!proposalId) return NextResponse.json({ error: 'proposalId é obrigatório.' }, { status: 400 })
    if (!templateId) return NextResponse.json({ error: 'Selecione um template.' }, { status: 400 })

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

    const { data: templateMeta } = await (supabase as any)
      .from('proposal_templates')
      .select('file_path')
      .eq('id', templateId)
      .eq('org_id', orgId)
      .single()

    if (!templateMeta) return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })

    const { data: templateBlob, error: downloadError } = await supabase.storage
      .from('proposal-templates')
      .download(templateMeta.file_path)

    if (downloadError || !templateBlob) {
      return NextResponse.json({ error: 'Erro ao baixar template: ' + downloadError?.message }, { status: 500 })
    }

    const templateBuffer = Buffer.from(await templateBlob.arrayBuffer())

    let docxBuffer: Buffer
    try {
      const zip = new PizZip(templateBuffer)

      const placeholders = buildPlaceholders(
        lead as any,
        {
          razao_social: orgConfig.razao_social,
          nome_fantasia: orgConfig.nome_fantasia,
          cnpj: orgConfig.cnpj,
          telefone: orgConfig.telefone,
        },
        {
          panel_qty: p.total_modules ?? 0,
          panel_power_w: p.module_power_wp ?? 0,
          panel_brand_model: p.panel_brand_model ?? null,
          inverter_qty: p.total_inverters ?? 0,
          inverter_power_w: p.inverter_power_w ?? 0,
          inverter_brand_model: p.inverter_brand_model ?? null,
          total_power_kwp: p.total_power_kwp ?? 0,
          monthly_generation_kwh: p.monthly_generation_kwh ?? 0,
          preco_total: preco_final,
          preco_calculado: preco_calculado_final,
          ajuste_valor: ajuste_comercial?.ajuste_valor ?? null,
          ajuste_percentual: ajuste_comercial?.ajuste_percentual ?? null,
          preco_final,
          valor_entrada: valor_entrada ?? 0,
          num_parcelas: num_parcelas ?? 0,
          valor_parcelas: valor_parcelas ?? 0,
        }
      )

      processDocxPlaceholders(zip, placeholders)
      docxBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }))
    } catch (templateErr: any) {
      logger.error('proposals/generate', 'Erro ao processar template', templateErr, { proposalId, templateId })
      return NextResponse.json({
        error: `Erro ao processar template: ${templateErr?.message ?? 'Erro desconhecido'}`,
        step: 'template_processing',
      }, { status: 422 })
    }

    const proposalName = (p.name ?? 'Proposta').replace(/[<>:"/\\|?*]/g, '_')
    const docxPath = `${orgId}/${proposalId}.docx`
    const { error: uploadError } = await supabase.storage
      .from('proposals')
      .upload(docxPath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Erro ao salvar DOCX: ' + uploadError.message, step: 'docx_upload' }, { status: 500 })
    }

    const convertSecret = process.env.CONVERTAPI_SECRET
    if (!convertSecret) {
      return NextResponse.json({ error: 'CONVERTAPI_SECRET não configurado.', step: 'config' }, { status: 500 })
    }

    const formData = new FormData()
    formData.append(
      'File',
      new Blob([new Uint8Array(docxBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      `${proposalName}.docx`
    )

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CONVERT_TIMEOUT_MS)

    let convertResult: any
    try {
      const convertResponse = await fetch(
        `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${convertSecret}&StoreFile=true`,
        { method: 'POST', body: formData, signal: controller.signal }
      )
      clearTimeout(timeout)

      if (!convertResponse.ok) {
        const errText = await convertResponse.text()
        logger.error('proposals/generate', 'ConvertAPI retornou erro', undefined, { status: convertResponse.status })
        return NextResponse.json({ error: 'Erro na conversão para PDF. Tente novamente.', step: 'pdf_conversion' }, { status: 502 })
      }

      convertResult = await convertResponse.json()
    } catch (fetchErr: any) {
      clearTimeout(timeout)
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({
          error: 'A conversão para PDF excedeu o tempo limite.',
          step: 'pdf_timeout',
        }, { status: 504 })
      }
      throw fetchErr
    }

    const pdfUrl: string = convertResult?.Files?.[0]?.Url ?? ''
    if (!pdfUrl) {
      return NextResponse.json({ error: 'ConvertAPI não retornou URL do PDF.', step: 'pdf_result' }, { status: 502 })
    }

    // Armazenar URL segura (via API autenticada) em vez de URL pública do bucket
    const docxUrl = `/api/storage/download?bucket=proposals&path=${encodeURIComponent(docxPath)}`
    await supabase.from('proposals').update({
      template_id: templateId,
      preco_total: preco_total_final,
      preco_calculado: preco_calculado_final,
      preco_final: preco_final,
      custo_kit: pricing.custo_kit,
      custo_projeto: pricing.custo_projeto,
      custo_instalacao: pricing.custo_instalacao,
      custo_km: pricing.custo_km,
      custo_ca: pricing.custo_ca,
      valor_entrada: valor_entrada ?? 0,
      valor_parcelas: valor_parcelas ?? 0,
      num_parcelas: num_parcelas ?? 0,
      pdf_url: pdfUrl,
      docx_url: docxUrl,
      pricing_overrides: overrides ?? null,
      gerado_em: new Date().toISOString(),
      ...(ajuste_comercial ? {
        ajuste_tipo:       ajuste_comercial.ajuste_tipo,
        ajuste_valor:      ajuste_comercial.ajuste_valor,
        ajuste_percentual: ajuste_comercial.ajuste_percentual,
        ajuste_motivo:     ajuste_comercial.ajuste_motivo || null,
      } : {}),
    } as any).eq('id', proposalId)

    return NextResponse.json({ pdf_url: pdfUrl, pdf_filename: `${proposalName}.pdf` })

  } catch (err: any) {
    logger.error('proposals/generate', 'Erro interno inesperado', err)
    return NextResponse.json({ error: 'Erro interno ao gerar proposta.', step: 'unknown' }, { status: 500 })
  } finally {
    if (releaseSlot) await releaseSlot()
  }
}

import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { calcularPreco } from '@/lib/proposals/pricing'
import { buildPlaceholders } from '@/lib/proposals/placeholders'

const CONVERT_TIMEOUT_MS = 90_000

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as {
      proposalId: string
      templateId: string
      valor_entrada: number
      valor_parcelas: number
      num_parcelas: number
    }

    const { proposalId, templateId, valor_entrada, valor_parcelas, num_parcelas } = body

    if (!proposalId) return NextResponse.json({ error: 'proposalId é obrigatório.' }, { status: 400 })
    if (!templateId) return NextResponse.json({ error: 'Selecione um template.' }, { status: 400 })

    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const supabase = await createClient()

    // 1. Buscar proposta
    const { data: rawProposal } = await (supabase as any)
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('organization_id', orgId)
      .single()

    if (!rawProposal) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 })
    const p = rawProposal as any

    // 2. Buscar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('name, city, phone')
      .eq('id', p.lead_id)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 })

    // 3. Buscar org_config
    const orgConfig = await getOrgConfig()

    // 4. Calcular preços
    const pricing = calcularPreco(
      {
        kit_value: p.kit_value ?? 0,
        total_power_kwp: p.total_power_kwp ?? 0,
        panel_qty: p.total_modules ?? 0,
        km_rodados: p.km_rodados ?? 0,
      },
      orgConfig
    )

    // 5. Buscar template do Storage
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

    // 6. Substituir placeholders com docxtemplater
    const templateBuffer = Buffer.from(await templateBlob.arrayBuffer())

    let docxBuffer: Buffer
    try {
      const zip = new PizZip(templateBuffer)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      })

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
          preco_total: pricing.preco_total,
          valor_entrada: valor_entrada ?? 0,
          num_parcelas: num_parcelas ?? 0,
          valor_parcelas: valor_parcelas ?? 0,
        }
      )

      doc.render(placeholders)
      const buf = doc.getZip().generate({ type: 'nodebuffer' })
      docxBuffer = Buffer.from(buf)
    } catch (templateErr: any) {
      console.error('[generate-proposal] Template error:', templateErr)
      const msg = templateErr?.properties?.errors
        ? templateErr.properties.errors.map((e: any) => `${e.id}: ${e.explanation}`).join('; ')
        : templateErr?.message ?? 'Erro desconhecido ao processar template.'
      return NextResponse.json({
        error: `Erro no template: ${msg}`,
        step: 'template_processing',
      }, { status: 422 })
    }

    // 7. Salvar DOCX no Storage
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

    // 8. Converter DOCX → PDF via ConvertAPI (com timeout)
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
      'proposta.docx'
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
        console.error('[generate-proposal] ConvertAPI error:', errText)
        return NextResponse.json({ error: 'Erro na conversão para PDF. Tente novamente.', step: 'pdf_conversion' }, { status: 502 })
      }

      convertResult = await convertResponse.json()
    } catch (fetchErr: any) {
      clearTimeout(timeout)
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({
          error: 'A conversão para PDF excedeu o tempo limite. O template pode ser muito grande ou complexo.',
          step: 'pdf_timeout',
        }, { status: 504 })
      }
      throw fetchErr
    }

    const pdfUrl: string = convertResult?.Files?.[0]?.Url ?? ''
    if (!pdfUrl) {
      return NextResponse.json({ error: 'ConvertAPI não retornou URL do PDF.', step: 'pdf_result' }, { status: 502 })
    }

    // 9. Salvar campos na proposta
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    await supabase.from('proposals').update({
      template_id: templateId,
      preco_total: pricing.preco_total,
      custo_kit: pricing.custo_kit,
      custo_projeto: pricing.custo_projeto,
      custo_instalacao: pricing.custo_instalacao,
      custo_km: pricing.custo_km,
      custo_ca: pricing.custo_ca,
      valor_entrada: valor_entrada ?? 0,
      valor_parcelas: valor_parcelas ?? 0,
      num_parcelas: num_parcelas ?? 0,
      pdf_url: pdfUrl,
      docx_url: `${supabaseUrl}/storage/v1/object/public/proposals/${docxPath}`,
      gerado_em: new Date().toISOString(),
    } as any).eq('id', proposalId)

    return NextResponse.json({ pdf_url: pdfUrl })

  } catch (err: any) {
    console.error('[generate-proposal]', err)
    return NextResponse.json({ error: err?.message ?? 'Erro interno.', step: 'unknown' }, { status: 500 })
  }
}

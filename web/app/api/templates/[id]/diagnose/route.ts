import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { enforceRate, RATE_POLICIES } from '@/lib/security/rate-policies'

const KNOWN_PLACEHOLDERS = [
  'cliente_nome', 'cliente_cidade', 'cliente_telefone',
  'empresa_nome', 'empresa_cnpj', 'empresa_telefone',
  'paineis_qtd', 'paineis_potencia', 'paineis_marca',
  'inversor_qtd', 'inversor_potencia', 'inversor_marca',
  'total_kwp', 'geracao_mensal',
  'preco_total',
  'data_proposta', 'validade_proposta',
]

type Finding = { type: 'ok' | 'warn' | 'error'; message: string }

function extractPlaceholders(zip: PizZip): {
  found: string[]
  fragmented: string[]
  singleBrace: string[]
} {
  const found: string[] = []
  const fragmented: string[] = []
  const singleBrace: string[] = []

  for (const fileName of Object.keys(zip.files)) {
    if (!fileName.endsWith('.xml') || zip.files[fileName].dir) continue
    const content = zip.files[fileName].asText()
    if (!content.includes('{{')) continue

    let i = 0
    while (i < content.length) {
      const openIdx = content.indexOf('{{', i)
      if (openIdx === -1) break

      const prevClose = content.lastIndexOf('>', openIdx)
      const prevOpen = content.lastIndexOf('<', openIdx)
      if (prevOpen > prevClose) { i = openIdx + 2; continue }

      let j = openIdx
      let textBuf = ''
      let dblFound = false
      const limit = Math.min(openIdx + 3000, content.length)

      while (j < limit) {
        if (content[j] === '<') {
          const closeAngle = content.indexOf('>', j)
          if (closeAngle === -1) break
          j = closeAngle + 1
          continue
        }
        textBuf += content[j]
        j++
        if (textBuf.endsWith('}}')) { dblFound = true; break }
      }

      let isSingleBrace = false
      if (!dblFound) {
        const sm = textBuf.match(/^\{\{([a-z_][a-z0-9_]*)\}$/i)
        if (sm) { dblFound = true; textBuf += '}'; isSingleBrace = true }
      }

      if (dblFound) {
        const match = textBuf.match(/^\{\{([a-z_][a-z0-9_]*)\}\}$/i)
        if (match) {
          const tag = match[1]
          if (!found.includes(tag)) found.push(tag)
          const rawSpan = content.substring(openIdx, j)
          if (rawSpan.includes('<') && !fragmented.includes(tag)) fragmented.push(tag)
          if (isSingleBrace && !singleBrace.includes(tag)) singleBrace.push(tag)
        }
      }

      i = Math.max(openIdx + 2, j)
    }
  }

  return { found, fragmented, singleBrace }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const blocked = await enforceRate(`api:tpl-diagnose:${orgId}`, RATE_POLICIES.sensitiveApi)
    if (blocked) return blocked

    const supabase = await createClient()

    const { data: templateMeta } = await (supabase as any)
      .from('proposal_templates')
      .select('file_path, name')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!templateMeta) return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })

    const { data: blob, error: dlErr } = await supabase.storage
      .from('proposal-templates')
      .download(templateMeta.file_path)

    if (dlErr || !blob) {
      return NextResponse.json({ error: 'Erro ao baixar template: ' + dlErr?.message }, { status: 500 })
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const findings: Finding[] = []
    const fileSizeKB = Math.round(buffer.length / 1024)
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(1)

    findings.push({ type: 'ok', message: `Arquivo DOCX válido (${fileSizeKB > 1024 ? fileSizeMB + ' MB' : fileSizeKB + ' KB'})` })

    if (buffer.length > 10 * 1024 * 1024) {
      findings.push({ type: 'error', message: `Arquivo muito grande (${fileSizeMB} MB). Limite recomendado: 10 MB.` })
    } else if (buffer.length > 5 * 1024 * 1024) {
      findings.push({ type: 'warn', message: `Arquivo grande (${fileSizeMB} MB). Pode demorar na conversão para PDF.` })
    }

    let zip: PizZip
    try {
      zip = new PizZip(buffer)
    } catch {
      return NextResponse.json({
        status: 'reprovado',
        findings: [{ type: 'error', message: 'Arquivo DOCX corrompido ou inválido.' }],
      })
    }

    // Images
    const imageFiles = Object.keys(zip.files).filter(f => f.startsWith('word/media/') && !zip.files[f].dir)
    if (imageFiles.length > 0) {
      findings.push({ type: 'ok', message: `${imageFiles.length} imagem(ns) encontrada(s)` })
      for (const img of imageFiles) {
        const imgSize = zip.files[img].asUint8Array().length
        const imgSizeMB = (imgSize / (1024 * 1024)).toFixed(1)
        if (imgSize > 10 * 1024 * 1024) {
          findings.push({ type: 'error', message: `Imagem ${img.split('/').pop()} tem ${imgSizeMB} MB — muito grande.` })
        } else if (imgSize > 3 * 1024 * 1024) {
          findings.push({ type: 'warn', message: `Imagem ${img.split('/').pop()} tem ${imgSizeMB} MB — considere comprimir.` })
        }
      }
    }

    // Tables
    const documentXml = zip.files['word/document.xml']?.asText() ?? ''
    const tableCount = (documentXml.match(/<w:tbl[ >]/g) ?? []).length
    if (tableCount > 0) {
      findings.push({ type: 'ok', message: `${tableCount} tabela(s) encontrada(s)` })
    }

    // Headers/footers
    const headerFooters = Object.keys(zip.files).filter(f => /^word\/(header|footer)\d+\.xml$/.test(f))
    if (headerFooters.length > 0) {
      findings.push({ type: 'ok', message: `${headerFooters.length} cabeçalho(s)/rodapé(s)` })
    }

    // Placeholders
    const { found, fragmented, singleBrace } = extractPlaceholders(zip)

    if (found.length > 0) {
      findings.push({ type: 'ok', message: `${found.length} placeholder(s): ${found.map(p => `{{${p}}}`).join(', ')}` })
    } else {
      findings.push({ type: 'warn', message: 'Nenhum placeholder encontrado no template' })
    }

    const unknown = found.filter(p => !KNOWN_PLACEHOLDERS.includes(p))
    if (unknown.length > 0) {
      findings.push({ type: 'warn', message: `Placeholder(s) não reconhecido(s): ${unknown.map(p => `{{${p}}}`).join(', ')}. Serão mantidos em branco.` })
    }

    if (fragmented.length > 0) {
      findings.push({ type: 'warn', message: `Placeholder(s) fragmentado(s) pelo Word: ${fragmented.map(p => `{{${p}}}`).join(', ')}. Corrigidos automaticamente na geração.` })
    }

    if (singleBrace.length > 0) {
      findings.push({ type: 'warn', message: `Placeholder(s) com fechamento incompleto (}} → }): ${singleBrace.map(p => `{{${p}}}`).join(', ')}. Corrigidos automaticamente na geração.` })
    }

    findings.push({ type: 'ok', message: 'Template compatível com a engine de geração (sanitização automática ativa)' })

    const hasError = findings.some(f => f.type === 'error')
    const hasWarn = findings.some(f => f.type === 'warn')
    const status = hasError ? 'reprovado' : hasWarn ? 'aprovado_com_alertas' : 'aprovado'

    return NextResponse.json({
      status,
      templateName: templateMeta.name,
      findings,
      placeholders: { found, unknown, fragmented, singleBrace, supported: KNOWN_PLACEHOLDERS },
      stats: { fileSizeKB, imageCount: imageFiles.length, tableCount, headerFooterCount: headerFooters.length },
    })

  } catch (err: any) {
    console.error('[diagnose-template]', err)
    return NextResponse.json({ error: err?.message ?? 'Erro interno.' }, { status: 500 })
  }
}

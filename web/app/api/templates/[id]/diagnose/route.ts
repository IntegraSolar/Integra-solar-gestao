import { NextResponse } from 'next/server'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

const KNOWN_PLACEHOLDERS = [
  'cliente_nome', 'cliente_cidade', 'cliente_telefone',
  'empresa_nome', 'empresa_cnpj', 'empresa_telefone',
  'paineis_qtd', 'paineis_potencia', 'paineis_marca',
  'inversor_qtd', 'inversor_potencia', 'inversor_marca',
  'total_kwp', 'geracao_mensal',
  'preco_total', 'valor_entrada', 'num_parcelas', 'valor_parcelas',
  'data_proposta', 'validade_proposta',
]

type Finding = { type: 'ok' | 'warn' | 'error'; message: string }

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserData()
    const orgId = user?.membership?.organization.id
    if (!orgId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const supabase = await createClient()

    const { data: templateMeta } = await (supabase as any)
      .from('proposal_templates')
      .select('file_path, name')
      .eq('id', params.id)
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

    // Structure validation
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
        findings: [{ type: 'error', message: 'Arquivo DOCX corrompido ou inválido. Não foi possível abrir.' }],
      })
    }

    // Count images
    const imageFiles = Object.keys(zip.files).filter(f =>
      f.startsWith('word/media/') && !zip.files[f].dir
    )
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

    // Count tables
    const documentXml = zip.files['word/document.xml']?.asText() ?? ''
    const tableCount = (documentXml.match(/<w:tbl[ >]/g) ?? []).length
    if (tableCount > 0) {
      findings.push({ type: 'ok', message: `${tableCount} tabela(s) encontrada(s)` })
    }

    // Check headers/footers
    const headerFooters = Object.keys(zip.files).filter(f =>
      /^word\/(header|footer)\d+\.xml$/.test(f)
    )
    if (headerFooters.length > 0) {
      findings.push({ type: 'ok', message: `${headerFooters.length} cabeçalho(s)/rodapé(s) encontrado(s)` })
    }

    // Extract placeholders using docxtemplater's parser
    const foundPlaceholders: string[] = []
    const brokenPlaceholders: string[] = []

    try {
      const doc = new Docxtemplater(new PizZip(buffer), {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      })

      // Render with empty data to find all tags
      const tags = doc.getFullText().match(/\{\{([^}]+)\}\}/g) ?? []
      for (const tag of tags) {
        const name = tag.replace(/\{\{|\}\}/g, '').trim()
        if (name && !foundPlaceholders.includes(name)) {
          foundPlaceholders.push(name)
        }
      }

      // Also scan raw XML for all placeholders (catches headers/footers)
      for (const fileName of Object.keys(zip.files)) {
        if (!fileName.endsWith('.xml') || zip.files[fileName].dir) continue
        const content = zip.files[fileName].asText()
        const xmlTags = content.match(/\{\{([^}<]+)\}\}/g) ?? []
        for (const tag of xmlTags) {
          const name = tag.replace(/\{\{|\}\}/g, '').trim()
          if (name && !foundPlaceholders.includes(name)) {
            foundPlaceholders.push(name)
          }
        }

        // Detect broken placeholders ({{ split across XML runs)
        const brokenPattern = /\{(?:<[^>]+>)*\{(?:<[^>]+>)*([^}]*?)(?:<[^>]+>)*\}(?:<[^>]+>)*\}/g
        let match
        while ((match = brokenPattern.exec(content)) !== null) {
          const raw = match[0]
          if (raw.includes('<w:r') || raw.includes('<w:t')) {
            const cleaned = raw.replace(/<[^>]+>/g, '').replace(/\{\{|\}\}/g, '').trim()
            if (cleaned && !brokenPlaceholders.includes(cleaned)) {
              brokenPlaceholders.push(cleaned)
            }
          }
        }
      }

      // Try a test render to catch template errors
      const testData: Record<string, string> = {}
      for (const ph of KNOWN_PLACEHOLDERS) testData[ph] = `[${ph}]`
      doc.render(testData)
      findings.push({ type: 'ok', message: 'Template compatível com a engine de geração' })

    } catch (docErr: any) {
      const errors = docErr?.properties?.errors
      if (errors && Array.isArray(errors)) {
        for (const e of errors) {
          findings.push({ type: 'error', message: `Erro no template: ${e.id} — ${e.explanation}` })
        }
      } else {
        findings.push({ type: 'error', message: `Erro ao processar template: ${docErr?.message}` })
      }
    }

    // Report placeholders
    if (foundPlaceholders.length > 0) {
      findings.push({ type: 'ok', message: `${foundPlaceholders.length} placeholder(s) encontrado(s): ${foundPlaceholders.map(p => `{{${p}}}`).join(', ')}` })
    } else {
      findings.push({ type: 'warn', message: 'Nenhum placeholder encontrado no template' })
    }

    const unknownPlaceholders = foundPlaceholders.filter(p => !KNOWN_PLACEHOLDERS.includes(p))
    if (unknownPlaceholders.length > 0) {
      findings.push({ type: 'warn', message: `Placeholder(s) não reconhecido(s): ${unknownPlaceholders.map(p => `{{${p}}}`).join(', ')}. Serão mantidos em branco.` })
    }

    if (brokenPlaceholders.length > 0) {
      findings.push({ type: 'warn', message: `Placeholder(s) com formatação fragmentada detectada: ${brokenPlaceholders.map(p => `{{${p}}}`).join(', ')}. O docxtemplater corrige automaticamente, mas considere redigitar no Word.` })
    }

    // Determine overall status
    const hasError = findings.some(f => f.type === 'error')
    const hasWarn = findings.some(f => f.type === 'warn')
    const status = hasError ? 'reprovado' : hasWarn ? 'aprovado_com_alertas' : 'aprovado'

    return NextResponse.json({
      status,
      templateName: templateMeta.name,
      findings,
      placeholders: {
        found: foundPlaceholders,
        unknown: unknownPlaceholders,
        broken: brokenPlaceholders,
        supported: KNOWN_PLACEHOLDERS,
      },
      stats: {
        fileSizeKB,
        imageCount: imageFiles.length,
        tableCount,
        headerFooterCount: headerFooters.length,
      },
    })

  } catch (err: any) {
    console.error('[diagnose-template]', err)
    return NextResponse.json({ error: err?.message ?? 'Erro interno.' }, { status: 500 })
  }
}

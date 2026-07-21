import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { guardPublicToken } from '@/lib/security/rate-policies'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarPdfDaApresentacao } from '@/lib/apresentacoes/pdf'
import { logger } from '@/lib/logger'

// Renderizar Chromium leva alguns segundos; o padrão da Vercel não basta.
export const maxDuration = 60

function nomeArquivo(cliente: string): string {
  const limpo = cliente.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Proposta'
  return `Proposta - ${limpo}.pdf`
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  // Gerar PDF é caro: o rate limit aqui importa mais que nas rotas de leitura.
  const blocked = await guardPublicToken('proposta-pdf')
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

  const caminho = `${link.organization_id}/${link.proposal_id}-apresentacao.pdf`

  // Cache: o PDF só é renderizado uma vez por proposta. Regerar o link ou salvar
  // nova configuração produz um token novo, então o cache não serve conteúdo velho.
  try {
    const { data: existente } = await supabase.storage.from('proposals').download(caminho)
    if (existente) {
      const buffer = Buffer.from(await existente.arrayBuffer())
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${nomeArquivo('apresentacao')}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }
  } catch {
    // Sem cache — segue para renderizar.
  }

  // URL absoluta da própria apresentação: é ela que o Chromium abre.
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  if (!host) {
    return NextResponse.json({ error: 'Não foi possível determinar o endereço.' }, { status: 500 })
  }
  const url = `${proto}://${host}/proposta/${token}`

  let pdf: Buffer
  try {
    pdf = await gerarPdfDaApresentacao(url)
  } catch (err: any) {
    const detalhe = String(err?.message ?? err ?? 'erro desconhecido')
    logger.error('proposta/pdf', 'Falha ao renderizar PDF', err, {
      token: token.slice(0, 8),
      detalhe: detalhe.slice(0, 300),
    })

    // Mensagem util em vez de "tente novamente": sem o motivo, a unica saida e
    // ler os logs da Vercel, que nem sempre estao a mao.
    let motivo = 'Não foi possível gerar o PDF agora. Tente novamente.'
    if (/executablePath|Browser was not found|ENOENT|spawn/i.test(detalhe)) {
      motivo = 'O renderizador de PDF não está disponível no servidor. Avise o suporte.'
    } else if (/timeout|TimeoutError/i.test(detalhe)) {
      motivo = 'A apresentação demorou demais para carregar. Tente novamente em instantes.'
    } else if (/memory|out of memory|OOM/i.test(detalhe)) {
      motivo = 'O servidor ficou sem memória ao gerar o PDF. Avise o suporte.'
    }

    return NextResponse.json({ error: motivo, detalhe: detalhe.slice(0, 200) }, { status: 502 })
  }

  // Guarda para as próximas visitas. Falha aqui não impede a entrega do arquivo.
  try {
    await supabase.storage
      .from('proposals')
      .upload(caminho, pdf, { contentType: 'application/pdf', upsert: true })
  } catch (err: any) {
    logger.error('proposta/pdf', 'PDF gerado mas não armazenado', err, { token: token.slice(0, 8) })
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomeArquivo('apresentacao')}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

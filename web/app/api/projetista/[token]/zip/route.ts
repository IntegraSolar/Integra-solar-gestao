import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JSZip from 'jszip'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: link } = await (supabase as any)
    .from('projetista_links')
    .select('client_id, organization_id')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  }

  const clientId = link.client_id

  const { data: client } = await (supabase as any)
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single()

  const zip = new JSZip()

  // 1. Client attachments (Documentos/)
  const { data: attachments } = await (supabase as any)
    .from('client_attachments')
    .select('type, file_url')
    .eq('client_id', clientId)

  for (const att of attachments ?? []) {
    if (!att.file_url) continue
    const match = att.file_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (!match) continue
    const [, bucket, path] = match
    const { data: fileData } = await supabase.storage.from(bucket).download(path)
    if (fileData) {
      const ext = path.split('.').pop() ?? 'bin'
      zip.file(`Documentos/${att.type}.${ext}`, await fileData.arrayBuffer())
    }
  }

  // 2. Project attachments + legacy docs (Outros Anexos/)
  const { data: project } = await (supabase as any)
    .from('client_projects')
    .select('id, art_url, projeto_url, parecer_acesso_url')
    .eq('client_id', clientId)
    .maybeSingle()

  if (project?.id) {
    const { data: projAtts } = await (supabase as any)
      .from('project_attachments')
      .select('file_name, file_path')
      .eq('project_id', project.id)

    for (const att of projAtts ?? []) {
      const { data: fileData } = await supabase.storage.from('project-docs').download(att.file_path)
      if (fileData) {
        zip.file(`Outros Anexos/${att.file_name}`, await fileData.arrayBuffer())
      }
    }

    for (const [key, label] of [['art_url', 'ART'], ['projeto_url', 'Projeto_Eletrico'], ['parecer_acesso_url', 'Parecer_Acesso']] as const) {
      const url = project[key]
      if (!url) continue
      const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
      if (!match) continue
      const [, bucket, path] = match
      const ext = path.split('.').pop() ?? 'pdf'
      const { data: fileData } = await supabase.storage.from(bucket).download(path)
      if (fileData) {
        zip.file(`Outros Anexos/${label}.${ext}`, await fileData.arrayBuffer())
      }
    }
  }

  // 3. Obra photos (Fotos/)
  const { data: obraDelivery } = await (supabase as any)
    .from('client_obra_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (obraDelivery?.id) {
    const { data: photos } = await (supabase as any)
      .from('obra_photos')
      .select('file_name, file_path')
      .eq('obra_delivery_id', obraDelivery.id)

    for (const photo of photos ?? []) {
      const { data: fileData } = await supabase.storage.from('project-docs').download(photo.file_path)
      if (fileData) {
        zip.file(`Fotos/${photo.file_name}`, await fileData.arrayBuffer())
      }
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const safeName = (client?.name ?? 'cliente').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_projeto.zip"`,
    },
  })
}

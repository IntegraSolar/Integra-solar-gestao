import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const ALLOWED_BUCKETS = ['proposals', 'receipts', 'project-docs', 'client-files']

export async function GET(req: NextRequest) {
  const user = await getCurrentUserData()
  if (!user?.membership?.organization.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 30 downloads por minuto por organização
  const orgId = user.membership.organization.id
  if (!await rateLimit(`download:${orgId}`, 30, 60_000)) return rateLimitResponse()

  const bucket = req.nextUrl.searchParams.get('bucket')
  const path = req.nextUrl.searchParams.get('path')

  if (!bucket || !path) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Bucket não permitido' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verificar que o path pertence à organização do usuário.
  const pathBelongsToOrg = async (): Promise<boolean> => {
    if (path.startsWith(orgId) || path.startsWith(`entrega-material/${orgId}`)) return true
    const segments = path.split('/')
    const uuidCandidate = segments[0] === 'entrega-material' ? segments[1] : segments[0]
    if (!uuidCandidate) return false
    // Verificar se é um project_id (anexos de projeto)
    const { count: projectCount } = await (supabase as any)
      .from('project_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('file_path', path)
    if ((projectCount ?? 0) > 0) return true
    // Verificar se é uma foto de obra
    const { count: obraCount } = await (supabase as any)
      .from('obra_photos')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('file_path', path)
    if ((obraCount ?? 0) > 0) return true
    // Verificar se é um client_id (paths legados)
    const { count } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('id', uuidCandidate)
      .eq('organization_id', orgId)
    return (count ?? 0) > 0
  }

  if (!(await pathBelongsToOrg())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}

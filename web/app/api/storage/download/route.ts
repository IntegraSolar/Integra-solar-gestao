import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

const ALLOWED_BUCKETS = ['proposals', 'receipts', 'project-docs', 'client-files']

export async function GET(req: NextRequest) {
  const user = await getCurrentUserData()
  if (!user?.membership?.organization.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const bucket = req.nextUrl.searchParams.get('bucket')
  const path = req.nextUrl.searchParams.get('path')

  if (!bucket || !path) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Bucket não permitido' }, { status: 403 })
  }

  // Verificar que o path pertence à organização do usuário
  const orgId = user.membership.organization.id
  if (!path.startsWith(orgId) && !path.startsWith(`entrega-material/${orgId}`)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}

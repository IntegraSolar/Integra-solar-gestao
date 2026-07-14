import { NextResponse } from 'next/server'
import { enforceRate, RATE_POLICIES } from '@/lib/security/rate-policies'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const blocked = await enforceRate(`api:tpl-download:${orgId}`, RATE_POLICIES.sensitiveApi)
  if (blocked) return blocked

  const supabase = await createClient()

  // Verificar que o template pertence à organização
  const { data: template } = await (supabase as any)
    .from('proposal_templates')
    .select('file_path, name')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!template) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('proposal-templates')
    .createSignedUrl(template.file_path, 60)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}

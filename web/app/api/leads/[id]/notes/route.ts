import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return NextResponse.json({ notes: [] })

  const supabase = await createClient()

  // Verificar que o lead pertence à organização
  const { data: lead } = await (supabase as any)
    .from('leads').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle()
  if (!lead) return NextResponse.json({ notes: [] })

  const { data } = await (supabase as any)
    .from('lead_notes')
    .select('id, content, created_at, created_by, author:profiles!created_by(full_name, email)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ notes: data ?? [] })
}

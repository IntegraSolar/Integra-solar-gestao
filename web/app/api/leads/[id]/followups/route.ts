import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return NextResponse.json({ followups: [] })

  const supabase = await createClient()

  // Verificar que o lead pertence à organização
  const { data: lead } = await (supabase as any)
    .from('leads').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle()
  if (!lead) return NextResponse.json({ followups: [] })

  const { data } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, completed_at, assigned_to_user_id')
    .eq('related_to_lead_id', id)
    .order('due_date', { ascending: true })

  return NextResponse.json({ followups: data ?? [] })
}

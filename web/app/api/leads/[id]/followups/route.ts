import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, completed_at, assigned_to_user_id')
    .eq('related_to_lead_id', params.id)
    .order('due_date', { ascending: true })

  return NextResponse.json({ followups: data ?? [] })
}

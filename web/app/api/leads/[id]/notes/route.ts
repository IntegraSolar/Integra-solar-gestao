import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('lead_notes')
    .select('id, content, created_at, created_by, author:profiles!created_by(full_name, email)')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ notes: data ?? [] })
}

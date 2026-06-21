import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const clientId = params.id

  const [project, purchase, delivery, obra, obraDelivery, posObra] = await Promise.all([
    (supabase as any).from('client_projects').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_purchases').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_deliveries').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_obras').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_obra_deliveries').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_pos_obra').select('*').eq('client_id', clientId).maybeSingle(),
  ])

  return NextResponse.json({
    project: project.data ?? null,
    purchase: purchase.data ?? null,
    delivery: delivery.data ?? null,
    obra: obra.data ?? null,
    obraDelivery: obraDelivery.data ?? null,
    posObra: posObra.data ?? null,
  })
}

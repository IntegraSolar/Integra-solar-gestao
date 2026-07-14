import { NextResponse } from 'next/server'
import { enforceRate, RATE_POLICIES } from '@/lib/security/rate-policies'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET() {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return NextResponse.json({ kits: [] })

  const blocked = await enforceRate(`api:kits:${orgId}`, RATE_POLICIES.sensitiveApi)
  if (blocked) return blocked

  const supabase = await createClient()

  // Admins/owners see all fields; restricted users (catalogo_kits permission) see only public fields
  const role = user?.membership?.role ?? ''
  const isAdmin = role === 'owner' || role === 'admin'

  const fields = isAdmin
    ? '*'
    : 'id,name,code,description,status,panel_brand,panel_model,panel_power_w,panel_qty,inverter_brand,inverter_model,inverter_power_w,inverter_qty,total_power_kwp,monthly_generation_kwh,annual_generation_kwh,sale_price,created_at,updated_at'

  const { data } = await (supabase as any)
    .from('kit_catalog')
    .select(fields)
    .eq('organization_id', orgId)
    .eq('status', 'ativo')
    .order('name', { ascending: true })

  return NextResponse.json({ kits: data ?? [] })
}

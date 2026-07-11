import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Find active link
  const { data: link } = await (supabase as any)
    .from('installer_links')
    .select('client_id, organization_id')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  }

  const clientId = link.client_id

  // Fetch client data
  const { data: client } = await (supabase as any)
    .from('clients')
    .select(`
      name, phone, email,
      street, number, neighborhood, city, state, zip,
      maps_coordinates,
      panel_brand, panel_power_w, system_power_kwp,
      inverter_brand, inverter_power_w,
      specific_panels, specific_inverter,
      roof_type, roof_orientation,
      entry_breaker, entry_cable_mm,
      has_adaptation_works, adaptation_details,
      inspection_done, client_notes
    `)
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Dados não encontrados' }, { status: 404 })
  }

  // Fetch proposal for equipment details (most recent approved or any)
  const { data: proposal } = await (supabase as any)
    .from('proposals')
    .select(`
      total_modules, module_power_wp, panel_brand_model,
      total_inverters, inverter_power_w, inverter_brand_model,
      total_power_kwp
    `)
    .eq('lead_id', (await (supabase as any).from('clients').select('lead_id').eq('id', clientId).single()).data?.lead_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch client attachments (photos)
  const { data: attachments } = await (supabase as any)
    .from('client_attachments')
    .select('id, type, file_url')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: true })

  // Build address
  const address = [client.street, client.number, client.neighborhood, client.city, client.state]
    .filter(Boolean).join(', ')

  // Parse adaptations
  let adaptations: string[] = []
  try {
    adaptations = JSON.parse(client.adaptation_details ?? '[]')
  } catch { /* empty */ }

  // Build equipment info
  const modules = {
    brand: proposal?.panel_brand_model ?? client.panel_brand ?? null,
    power_w: proposal?.module_power_wp ?? client.panel_power_w ?? null,
    qty: proposal?.total_modules ?? null,
  }

  const inverters = {
    brand: proposal?.inverter_brand_model ?? client.inverter_brand ?? null,
    power_w: proposal?.inverter_power_w ?? client.inverter_power_w ?? null,
    qty: proposal?.total_inverters ?? null,
  }

  // Generate signed URLs for attachments
  const photos: { type: string; url: string }[] = []
  for (const att of attachments ?? []) {
    if (!att.file_url) continue
    // Convert stored URL to signed URL
    const match = att.file_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (match) {
      const [, bucket, path] = match
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600)
      if (signed?.signedUrl) {
        photos.push({ type: att.type, url: signed.signedUrl })
      }
    }
  }

  return NextResponse.json({
    client: {
      name: client.name,
      phone: client.phone,
      address,
      city: client.city,
      state: client.state,
      maps_coordinates: client.maps_coordinates,
    },
    equipment: {
      modules,
      inverters,
      total_power_kwp: proposal?.total_power_kwp ?? client.system_power_kwp ?? null,
    },
    installation: {
      roof_type: client.roof_type,
      roof_orientation: client.roof_orientation,
      entry_breaker: client.entry_breaker,
      entry_cable_mm: client.entry_cable_mm,
    },
    adaptations: {
      has_adaptations: client.has_adaptation_works ?? false,
      items: adaptations,
    },
    photos,
    notes: client.client_notes,
  })
}

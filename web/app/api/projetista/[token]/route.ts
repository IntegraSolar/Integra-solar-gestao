import { NextResponse } from 'next/server'
import { enforceRate, getClientIp, RATE_POLICIES } from '@/lib/security/rate-policies'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const blocked = await enforceRate(`pub:projetista:${await getClientIp()}`, RATE_POLICIES.publicToken)
  if (blocked) return blocked
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: link } = await (supabase as any)
    .from('projetista_links')
    .select('client_id, organization_id')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  }

  const clientId = link.client_id

  const { data: client } = await (supabase as any)
    .from('clients')
    .select(`
      name, phone, email, cpf_cnpj,
      street, number, neighborhood, city, state, zip,
      maps_coordinates,
      panel_brand, panel_power_w, system_power_kwp,
      inverter_brand, inverter_power_w,
      specific_panels, specific_inverter,
      roof_type, roof_orientation,
      entry_breaker, entry_cable_mm,
      has_adaptation_works, adaptation_details,
      inspection_done, client_notes,
      lead_id
    `)
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Dados não encontrados' }, { status: 404 })
  }

  const { data: proposal } = await (supabase as any)
    .from('proposals')
    .select(`
      total_modules, module_power_wp, panel_brand_model,
      total_inverters, inverter_power_w, inverter_brand_model,
      total_power_kwp
    `)
    .eq('lead_id', client.lead_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: project } = await (supabase as any)
    .from('client_projects')
    .select('id, responsavel_nome, numero_processo, data_protocolo, prazo_protocolo, status, checklist, art_url, projeto_url, parecer_acesso_url')
    .eq('client_id', clientId)
    .maybeSingle()

  let projectAttachments: any[] = []
  if (project?.id) {
    const { data: atts } = await (supabase as any)
      .from('project_attachments')
      .select('id, file_name, file_path, uploaded_at')
      .eq('project_id', project.id)
      .order('uploaded_at', { ascending: true })
    projectAttachments = atts ?? []
  }

  const { data: attachments } = await (supabase as any)
    .from('client_attachments')
    .select('id, type, file_url')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: true })

  const { data: obraDelivery } = await (supabase as any)
    .from('client_obra_deliveries')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  let obraPhotos: any[] = []
  if (obraDelivery?.id) {
    const { data: photos } = await (supabase as any)
      .from('obra_photos')
      .select('id, file_name, file_path, uploaded_at')
      .eq('obra_delivery_id', obraDelivery.id)
      .order('uploaded_at', { ascending: true })
    obraPhotos = photos ?? []
  }

  const address = [client.street, client.number, client.neighborhood, client.city, client.state]
    .filter(Boolean).join(', ')

  let adaptations: string[] = []
  try { adaptations = JSON.parse(client.adaptation_details ?? '[]') } catch { /* empty */ }

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

  // Generate signed URLs for client attachments
  const documents: { type: string; url: string; name: string }[] = []
  for (const att of attachments ?? []) {
    if (!att.file_url) continue
    const match = att.file_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (match) {
      const [, bucket, path] = match
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
      if (signed?.signedUrl) {
        documents.push({ type: att.type, url: signed.signedUrl, name: att.type })
      }
    }
  }

  // Signed URLs for project attachments
  const projectDocs: { name: string; url: string; path: string }[] = []
  for (const att of projectAttachments) {
    const { data: signed } = await supabase.storage.from('project-docs').createSignedUrl(att.file_path, 3600)
    if (signed?.signedUrl) {
      projectDocs.push({ name: att.file_name, url: signed.signedUrl, path: att.file_path })
    }
  }

  // Signed URLs for obra photos
  const photos: { name: string; url: string; path: string }[] = []
  for (const photo of obraPhotos) {
    const { data: signed } = await supabase.storage.from('project-docs').createSignedUrl(photo.file_path, 3600)
    if (signed?.signedUrl) {
      photos.push({ name: photo.file_name, url: signed.signedUrl, path: photo.file_path })
    }
  }

  // Legacy project docs (ART, projeto, parecer)
  const legacyDocs: { label: string; url: string }[] = []
  for (const [key, label] of [['art_url', 'ART'], ['projeto_url', 'Projeto Elétrico'], ['parecer_acesso_url', 'Parecer de Acesso']] as const) {
    const url = project?.[key]
    if (!url) continue
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (match) {
      const [, bucket, path] = match
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
      if (signed?.signedUrl) {
        legacyDocs.push({ label, url: signed.signedUrl })
      }
    }
  }

  return NextResponse.json({
    client: {
      name: client.name,
      phone: client.phone,
      email: client.email,
      cpf_cnpj: client.cpf_cnpj,
      address,
      city: client.city,
      state: client.state,
      zip: client.zip,
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
    project: project ? {
      responsavel: project.responsavel_nome,
      numero_processo: project.numero_processo,
      status: project.status,
    } : null,
    documents,
    projectDocs,
    legacyDocs,
    photos,
    notes: client.client_notes,
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = await createClient()

  // Verificar que o cliente pertence à organização do usuário
  const { data: client } = await (supabase as any)
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const [project, purchase, delivery, obra, obraDelivery, posObra] = await Promise.all([
    (supabase as any).from('client_projects').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_purchases').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_deliveries').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_obras').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_obra_deliveries').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_pos_obra').select('*').eq('client_id', clientId).maybeSingle(),
  ])

  // Fetch project attachments
  let projectAttachments: any[] = []
  if (project.data?.id) {
    const { data: atts } = await (supabase as any)
      .from('project_attachments')
      .select('id, file_name, file_path, uploaded_at')
      .eq('project_id', project.data.id)
      .order('uploaded_at', { ascending: true })
    projectAttachments = atts ?? []
  }

  // Fetch obra photos
  let obraPhotos: any[] = []
  if (obraDelivery.data?.id) {
    const { data: photos } = await (supabase as any)
      .from('obra_photos')
      .select('id, file_name, file_path, uploaded_at')
      .eq('obra_delivery_id', obraDelivery.data.id)
      .order('uploaded_at', { ascending: true })
    obraPhotos = photos ?? []
  }

  // Fetch installer link
  const { data: installerLink } = await (supabase as any)
    .from('installer_links')
    .select('token')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  // Fetch projetista link
  const { data: projetistaLink } = await (supabase as any)
    .from('projetista_links')
    .select('token')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  // Fetch client portal link
  const { data: portalLink } = await (supabase as any)
    .from('client_portal_links')
    .select('token')
    .eq('client_id', clientId)
    .eq('organization_id', orgId)
    .eq('active', true)
    .maybeSingle()

  return NextResponse.json({
    project: project.data ?? null,
    projectAttachments,
    purchase: purchase.data ?? null,
    delivery: delivery.data ?? null,
    obra: obra.data ?? null,
    obraDelivery: obraDelivery.data ?? null,
    obraPhotos,
    posObra: posObra.data ?? null,
    installerToken: installerLink?.token ?? null,
    projetistaToken: projetistaLink?.token ?? null,
    portalToken: portalLink?.token ?? null,
  })
}

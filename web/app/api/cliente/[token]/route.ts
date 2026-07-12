import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type TimelineStage = {
  key: string
  label: string
  status: 'concluido' | 'em_andamento' | 'aguardando' | 'pendente'
  date?: string | null
  endDate?: string | null
}

type HistoryEvent = {
  date: string
  title: string
  description: string
  category: string
  icon: string
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: link } = await (supabase as any)
    .from('client_portal_links')
    .select('client_id, organization_id')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })
  }

  const clientId = link.client_id
  const orgId = link.organization_id

  // Fetch organization info
  const { data: org } = await (supabase as any)
    .from('organizations')
    .select('name, logo_url')
    .eq('id', orgId)
    .single()

  // Fetch client
  const { data: client } = await (supabase as any)
    .from('clients')
    .select(`
      name, phone, email, cpf_cnpj,
      street, number, neighborhood, city, state, zip,
      maps_coordinates,
      panel_brand, panel_power_w, system_power_kwp,
      inverter_brand, inverter_power_w,
      specific_panels, specific_inverter,
      contract_date, delivery_start_date, contract_max_days,
      has_adaptation_works, adaptation_details,
      client_notes, lead_id, created_at
    `)
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Dados não encontrados' }, { status: 404 })
  }

  // Fetch all pipeline data in parallel
  const [
    saleRes, contractRes, projectRes, purchaseRes,
    deliveryRes, obraRes, obraDeliveryRes, posObraRes,
    installmentsRes, attachmentsRes, proposalRes, latestReceiptRes
  ] = await Promise.all([
    (supabase as any).from('client_sales').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_contracts').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_projects').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_purchases').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_deliveries').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_obras').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_obra_deliveries').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_pos_obra').select('*').eq('client_id', clientId).maybeSingle(),
    (supabase as any).from('client_installments').select('*').eq('client_id', clientId).order('position', { ascending: true }),
    (supabase as any).from('client_attachments').select('id, type, file_url').eq('client_id', clientId).order('uploaded_at', { ascending: true }),
    (supabase as any).from('proposals').select('total_modules, module_power_wp, panel_brand_model, total_inverters, inverter_power_w, inverter_brand_model, total_power_kwp')
      .eq('lead_id', client.lead_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    (supabase as any).from('payment_receipts').select('token, version, total_paid, created_at').eq('client_id', clientId).order('version', { ascending: false }).limit(1).maybeSingle(),
  ])

  const sale = saleRes.data
  const contract = contractRes.data
  const project = projectRes.data
  const purchase = purchaseRes.data
  const delivery = deliveryRes.data
  const obra = obraRes.data
  const obraDelivery = obraDeliveryRes.data
  const posObra = posObraRes.data
  const installments = installmentsRes.data ?? []
  const attachments = attachmentsRes.data ?? []
  const proposal = proposalRes.data

  // Project attachments
  let projectAttachments: any[] = []
  if (project?.id) {
    const { data: atts } = await (supabase as any)
      .from('project_attachments')
      .select('id, file_name, file_path, uploaded_at')
      .eq('project_id', project.id)
      .order('uploaded_at', { ascending: true })
    projectAttachments = atts ?? []
  }

  // Obra photos
  let obraPhotos: any[] = []
  if (obraDelivery?.id) {
    const { data: photos } = await (supabase as any)
      .from('obra_photos')
      .select('id, file_name, file_path, uploaded_at')
      .eq('obra_delivery_id', obraDelivery.id)
      .order('uploaded_at', { ascending: true })
    obraPhotos = photos ?? []
  }

  // Build timeline stages
  const timeline: TimelineStage[] = buildTimeline(sale, contract, project, purchase, delivery, obra, obraDelivery, posObra)

  // Build history events
  const history: HistoryEvent[] = buildHistory(client, sale, contract, project, purchase, delivery, obra, obraDelivery, posObra, installments)

  // Build notices
  const notices: string[] = buildNotices(project, installments, obraDelivery, posObra)

  // Equipment
  const equipment = {
    modules: {
      brand: proposal?.panel_brand_model ?? client.panel_brand ?? null,
      power_w: proposal?.module_power_wp ?? client.panel_power_w ?? null,
      qty: proposal?.total_modules ?? null,
    },
    inverters: {
      brand: proposal?.inverter_brand_model ?? client.inverter_brand ?? null,
      power_w: proposal?.inverter_power_w ?? client.inverter_power_w ?? null,
      qty: proposal?.total_inverters ?? null,
    },
    total_power_kwp: proposal?.total_power_kwp ?? client.system_power_kwp ?? null,
  }

  // Monitoring app
  const monitoring = obraDelivery?.monitor_app ? {
    app: obraDelivery.monitor_app,
    user: obraDelivery.monitor_user,
    password: obraDelivery.monitor_pass,
  } : null

  // Financeiro
  const financial = sale ? {
    sale_value: sale.sale_value,
    payment_method: sale.payment_method,
    installments: installments.map((inst: any) => ({
      position: inst.position,
      due_date: inst.due_date,
      amount: inst.amount,
      status: inst.status,
      confirmed_at: inst.confirmed_at ?? null,
    })),
  } : null

  // Prazo
  const startDate = client.delivery_start_date ?? client.contract_date ?? null
  const maxDays = client.contract_max_days ?? null

  // Signed URLs for documents
  const documents: { type: string; label: string; url: string }[] = []

  // Contract
  if (contract?.contract_url) {
    const signed = await signUrl(supabase, contract.contract_url)
    if (signed) documents.push({ type: 'contrato', label: 'Contrato', url: signed })
  }
  if (contract?.power_of_attorney_url) {
    const signed = await signUrl(supabase, contract.power_of_attorney_url)
    if (signed) documents.push({ type: 'procuracao', label: 'Procuração', url: signed })
  }

  // Client attachments
  for (const att of attachments) {
    if (!att.file_url) continue
    const signed = await signUrl(supabase, att.file_url)
    if (signed) {
      const labels: Record<string, string> = {
        procuracao: 'Procuração', conta_luz: 'Conta de Luz', rg_cnh: 'RG / CNH',
        foto_disjuntor: 'Foto do Disjuntor', foto_maps: 'Foto Aérea',
        foto_frente: 'Foto da Frente', proposta_formalizada: 'Proposta Comercial',
        cotacao_material: 'Cotação de Material',
      }
      documents.push({ type: att.type, label: labels[att.type] ?? att.type, url: signed })
    }
  }

  // Project attachments with signed URLs
  const projDocs: { name: string; url: string }[] = []
  for (const att of projectAttachments) {
    const { data: signed } = await supabase.storage.from('project-docs').createSignedUrl(att.file_path, 3600)
    if (signed?.signedUrl) projDocs.push({ name: att.file_name, url: signed.signedUrl })
  }

  // Legacy project docs
  if (project?.art_url) {
    const signed = await signUrl(supabase, project.art_url)
    if (signed) projDocs.push({ name: 'ART', url: signed })
  }
  if (project?.projeto_url) {
    const signed = await signUrl(supabase, project.projeto_url)
    if (signed) projDocs.push({ name: 'Projeto Elétrico', url: signed })
  }
  if (project?.parecer_acesso_url) {
    const signed = await signUrl(supabase, project.parecer_acesso_url)
    if (signed) projDocs.push({ name: 'Parecer de Acesso', url: signed })
  }

  // Obra photos with signed URLs
  const photos: { name: string; url: string }[] = []
  for (const photo of obraPhotos) {
    const { data: signed } = await supabase.storage.from('project-docs').createSignedUrl(photo.file_path, 3600)
    if (signed?.signedUrl) photos.push({ name: photo.file_name, url: signed.signedUrl })
  }

  return NextResponse.json({
    organization: {
      name: org?.name ?? 'Integra Solar',
      logo_url: org?.logo_url ?? null,
    },
    client: {
      name: client.name,
      city: client.city,
      state: client.state,
    },
    project: project ? {
      numero_processo: project.numero_processo,
      status: project.status,
    } : null,
    timeline,
    history,
    notices,
    deadline: {
      start_date: startDate,
      max_days: maxDays,
    },
    financial,
    equipment,
    monitoring,
    documents,
    projectDocs: projDocs,
    photos,
    latestReceipt: latestReceiptRes?.data ? {
      token: latestReceiptRes.data.token,
      version: latestReceiptRes.data.version,
      total_paid: Number(latestReceiptRes.data.total_paid),
      created_at: latestReceiptRes.data.created_at,
    } : null,
  })
}

async function signUrl(supabase: any, url: string): Promise<string | null> {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (!match) return null
  const [, bucket, path] = match
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

function buildTimeline(
  sale: any, contract: any, project: any, purchase: any,
  delivery: any, obra: any, obraDelivery: any, posObra: any
): TimelineStage[] {
  const stages: TimelineStage[] = []

  // 1. Venda
  stages.push({
    key: 'venda',
    label: 'Venda concluída',
    status: sale ? 'concluido' : 'aguardando',
    date: sale?.created_at ?? null,
  })

  // 2. Contrato
  const contractSigned = contract?.signed === true
  stages.push({
    key: 'contrato',
    label: 'Contrato assinado',
    status: contractSigned ? 'concluido' : contract ? 'em_andamento' : 'aguardando',
    date: contract?.signed_at ?? contract?.created_at ?? null,
  })

  // 3. Documentação
  stages.push({
    key: 'documentacao',
    label: 'Documentação recebida',
    status: contract ? 'concluido' : 'aguardando',
    date: contract?.created_at ?? null,
  })

  // 4. Projeto
  const projStatus = project?.status ?? null
  const projDone = projStatus === 'aprovado'
  const projInProgress = projStatus === 'em_analise' || projStatus === 'enviado'
  stages.push({
    key: 'projeto',
    label: 'Projeto em desenvolvimento',
    status: projDone || projInProgress ? 'concluido' : project ? 'em_andamento' : 'aguardando',
    date: project?.created_at ?? null,
  })

  // 5. Projeto enviado
  stages.push({
    key: 'projeto_enviado',
    label: 'Projeto enviado para aprovação',
    status: projDone ? 'concluido' : projStatus === 'enviado' || projStatus === 'em_analise' ? 'em_andamento' : 'aguardando',
    date: project?.data_protocolo ?? null,
  })

  // 6. Aprovação
  stages.push({
    key: 'aprovacao',
    label: 'Aprovação da concessionária',
    status: projDone ? 'concluido' : projStatus === 'em_analise' ? 'em_andamento' : 'aguardando',
  })

  // 7. Compras / Material
  const materialReady = delivery?.status === 'entregue' || delivery?.status === 'confirmada'
  stages.push({
    key: 'material',
    label: 'Materiais e equipamentos',
    status: materialReady ? 'concluido' : purchase ? 'em_andamento' : 'aguardando',
    date: purchase?.created_at ?? null,
  })

  // 8. Instalação
  const obraStatus = obra?.status ?? null
  const obraDone = obraStatus === 'concluida' || obraDelivery != null
  stages.push({
    key: 'instalacao',
    label: 'Instalação',
    status: obraDone ? 'concluido' : obraStatus === 'em_andamento' ? 'em_andamento' : obra ? 'em_andamento' : 'aguardando',
    date: obra?.data_inicio ?? null,
    endDate: obraDelivery?.data_entrega ?? null,
  })

  // 9. Vistoria
  const vistoriaDone = project?.checklist?.homologacao === true || posObra != null
  stages.push({
    key: 'vistoria',
    label: 'Vistoria',
    status: vistoriaDone ? 'concluido' : project?.data_solicitacao_vistoria ? 'em_andamento' : 'aguardando',
    date: project?.data_solicitacao_vistoria ?? null,
  })

  // 10. Homologação
  stages.push({
    key: 'homologacao',
    label: 'Homologação',
    status: posObra ? 'concluido' : vistoriaDone ? 'em_andamento' : 'aguardando',
  })

  // 11. Liberado
  stages.push({
    key: 'liberado',
    label: 'Sistema liberado para geração',
    status: posObra?.status === 'concluida' || posObra?.status === 'concluido' ? 'concluido' : posObra ? 'em_andamento' : 'aguardando',
  })

  return stages
}

function buildHistory(
  client: any, sale: any, contract: any, project: any,
  purchase: any, delivery: any, obra: any, obraDelivery: any,
  posObra: any, installments: any[]
): HistoryEvent[] {
  const events: HistoryEvent[] = []

  if (client.created_at) {
    events.push({ date: client.created_at, title: 'Cadastro realizado', description: 'Seu projeto foi registrado em nosso sistema.', category: 'geral', icon: '📋' })
  }

  if (sale?.created_at) {
    events.push({ date: sale.created_at, title: 'Venda concluída', description: 'A proposta comercial foi aceita e a venda foi registrada.', category: 'financeiro', icon: '💰' })
  }

  if (contract?.created_at) {
    events.push({ date: contract.created_at, title: 'Contrato gerado', description: 'O contrato foi preparado para assinatura.', category: 'documentacao', icon: '📄' })
  }

  if (contract?.signed_at) {
    events.push({ date: contract.signed_at, title: 'Contrato assinado', description: 'O contrato foi assinado com sucesso.', category: 'documentacao', icon: '✅' })
  }

  if (project?.created_at) {
    events.push({ date: project.created_at, title: 'Projeto iniciado', description: 'O projeto técnico começou a ser desenvolvido.', category: 'projeto', icon: '📐' })
  }

  if (project?.data_protocolo) {
    events.push({ date: project.data_protocolo, title: 'Projeto protocolado', description: 'O projeto foi enviado para análise da concessionária.', category: 'aprovacao', icon: '📨' })
  }

  if (project?.status === 'aprovado') {
    const approvalDate = project.updated_at ?? project.data_protocolo
    if (approvalDate) {
      events.push({ date: approvalDate, title: 'Projeto aprovado', description: 'Seu projeto foi aprovado pela concessionária.', category: 'aprovacao', icon: '🎉' })
    }
  }

  if (purchase?.created_at) {
    events.push({ date: purchase.created_at, title: 'Materiais solicitados', description: 'Os equipamentos foram solicitados ao fornecedor.', category: 'instalacao', icon: '📦' })
  }

  if (delivery?.data_entrega) {
    events.push({ date: delivery.data_entrega, title: 'Materiais entregues', description: 'Os equipamentos foram recebidos e conferidos.', category: 'instalacao', icon: '🚚' })
  }

  if (obra?.data_inicio) {
    events.push({ date: obra.data_inicio, title: 'Instalação iniciada', description: 'A equipe iniciou a instalação do sistema fotovoltaico.', category: 'instalacao', icon: '🔧' })
  }

  if (obraDelivery?.data_entrega) {
    events.push({ date: obraDelivery.data_entrega, title: 'Instalação concluída', description: 'A instalação foi finalizada e os testes iniciais foram realizados.', category: 'instalacao', icon: '⚡' })
  }

  if (project?.data_solicitacao_vistoria) {
    events.push({ date: project.data_solicitacao_vistoria, title: 'Vistoria solicitada', description: 'Foi solicitada a vistoria técnica da concessionária.', category: 'homologacao', icon: '🔍' })
  }

  if (posObra?.created_at) {
    events.push({ date: posObra.created_at, title: 'Pós-obra registrada', description: 'O acompanhamento pós-instalação foi iniciado.', category: 'homologacao', icon: '📊' })
  }

  if (posObra?.status === 'concluida' || posObra?.status === 'concluido') {
    events.push({ date: posObra.updated_at ?? posObra.created_at, title: 'Sistema liberado', description: 'Seu sistema está homologado e liberado para geração de energia!', category: 'homologacao', icon: '☀️' })
  }

  // Payment events
  for (const inst of installments) {
    if (inst.confirmed_at) {
      events.push({
        date: inst.confirmed_at,
        title: `Pagamento confirmado`,
        description: `${inst.position === 1 ? 'Entrada' : `Parcela ${inst.position}`} no valor de R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} confirmada.`,
        category: 'financeiro',
        icon: '✅',
      })
    }
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return events
}

function buildNotices(project: any, installments: any[], obraDelivery: any, posObra: any): string[] {
  const notices: string[] = []

  // Overdue installments
  const now = new Date()
  const overdue = installments.filter((i: any) =>
    i.status !== 'confirmada' && i.status !== 'pago' && i.due_date && new Date(i.due_date) < now
  )
  if (overdue.length > 0) {
    notices.push(`Você possui ${overdue.length} parcela(s) em atraso. Entre em contato para regularizar.`)
  }

  if (project?.status === 'enviado' || project?.status === 'em_analise') {
    notices.push('Seu projeto foi enviado para aprovação da concessionária.')
  }

  if (project?.status === 'aprovado') {
    notices.push('Seu projeto foi aprovado pela concessionária!')
  }

  if (obraDelivery?.data_entrega) {
    notices.push('A instalação do seu sistema foi concluída com sucesso!')
  }

  if (posObra?.status === 'concluida' || posObra?.status === 'concluido') {
    notices.push('Seu sistema está homologado e gerando energia!')
  }

  return notices
}

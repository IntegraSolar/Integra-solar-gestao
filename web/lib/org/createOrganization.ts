'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type CreateOrganizationParams = {
  userId: string
  email: string
  full_name: string
  company_name: string
  phone?: string
  plan?: string
}

// Role ID do "Super Admin" — dono da conta ao criar a org.
const SUPER_ADMIN_ROLE_ID = '9db39e35-0e9b-4617-986f-8b3f7af74db3'

export async function createOrganizationResources(
  params: CreateOrganizationParams
): Promise<{ orgId: string }> {
  const { userId, email, full_name, company_name, phone, plan = 'professional' } = params

  const admin = createAdminClient()

  // 1. Criar organização
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: company_name,
      plan,
      status: 'active',
      phone: phone ?? null,
      email,
    })
    .select('id')
    .single()

  if (orgError || !org) {
    throw new Error('Erro ao criar empresa: ' + (orgError?.message ?? 'desconhecido'))
  }

  const orgId: string = org.id

  // 2. Vincular user como Super Admin na app_users
  const { error: userError } = await admin
    .from('app_users' as any)
    .insert({
      id: userId,
      organization_id: orgId,
      email,
      name: full_name,
      role_id: SUPER_ADMIN_ROLE_ID,
      is_active: true,
    })

  if (userError) {
    await admin.from('organizations').delete().eq('id', orgId)
    throw new Error('Erro ao vincular usuário: ' + userError.message)
  }

  // 3. Criar etapas padrão do funil
  const defaultStages = [
    { name: 'Chegada de Leads', order: 1, color: '#6B7A90' },
    { name: 'Follow-up', order: 2, color: '#3B82F6' },
    { name: 'Visita Agendada', order: 3, color: '#F59E0B' },
    { name: 'Proposta Enviada', order: 4, color: '#8B5CF6' },
    { name: 'Negociação', order: 5, color: '#F97316' },
    { name: 'Contrato Assinado', order: 6, color: '#10B981' },
  ]

  await admin.from('pipeline_stages').insert(
    defaultStages.map((d) => ({ ...d, organization_id: orgId }))
  )

  // 4. Criar configurações padrão de proposta
  await admin.from('proposal_defaults').insert({
    organization_id: orgId,
    custo_projeto: 150,
    custo_instalacao: 300,
    valor_km: 2,
    custo_ca_pct: 5,
    comissao_pct: 5,
    imposto_pct: 8,
    margem_pct: 15,
    prazo_contrato: 90,
  }).then(null, () => null)

  // 5. Template padrão de proposta (se existir no storage global)
  try {
    const { data: globalTemplate } = await admin.storage
      .from('proposal-templates')
      .download('global/template-padrao.docx')
    if (globalTemplate) {
      const filePath = `${orgId}/template-padrao.docx`
      await admin.storage
        .from('proposal-templates')
        .upload(filePath, globalTemplate, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      await admin.from('proposal_templates').insert({
        org_id: orgId,
        name: 'Template Padrão',
        category: 'Residencial e comercial',
        file_path: filePath,
        is_default: true,
        is_active: true,
      })
    }
  } catch {
    // Template opcional — não bloqueia criação da org
  }

  return { orgId }
}

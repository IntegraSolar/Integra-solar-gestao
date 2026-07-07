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

/**
 * Cria todos os recursos necessários para uma nova organização:
 * 1. Perfil do usuário (profiles)
 * 2. Organização
 * 3. Vínculo owner (organization_members)
 * 4. Configuração padrão (org_config)
 * 5. Etapas padrão do funil (pipeline_stages)
 * 6. Template padrão de proposta (se existir no storage global)
 *
 * Lança erro em caso de falha — o chamador é responsável por rollback
 * do auth user se necessário.
 */
export async function createOrganizationResources(
  params: CreateOrganizationParams
): Promise<{ orgId: string }> {
  const { userId, email, full_name, company_name, phone, plan = 'professional' } = params

  const adminClient = createAdminClient()

  // 1. Criar profile
  await (adminClient as any).from('profiles').upsert({
    id: userId,
    email,
    full_name,
  })

  // 2. Criar organização
  const { data: org, error: orgError } = await (adminClient as any)
    .from('organizations')
    .insert({ name: company_name, plan, status: 'active' })
    .select('id')
    .single()

  if (orgError || !org) {
    throw new Error('Erro ao criar empresa: ' + (orgError?.message ?? 'desconhecido'))
  }

  const orgId: string = org.id

  // 3. Vincular user como owner
  const { error: memberError } = await (adminClient as any)
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: userId,
      role: 'owner',
      permissions: {},
    })

  if (memberError) {
    // Desfaz a org criada — o auth user é responsabilidade do chamador
    await (adminClient as any).from('organizations').delete().eq('id', orgId)
    throw new Error('Erro ao vincular usuário: ' + memberError.message)
  }

  // 4. Criar org_config padrão
  await (adminClient as any).from('org_config').insert({
    organization_id: orgId,
    telefone: phone ?? null,
  })

  // 5. Criar etapas padrão do funil
  const defaultStages = [
    { name: 'Chegada de Leads', order: 1, color: '#6B7A90' },
    { name: 'Follow-up', order: 2, color: '#3B82F6' },
    { name: 'Visita Agendada', order: 3, color: '#F59E0B' },
    { name: 'Contrato Assinado', order: 4, color: '#10B981', is_terminal_won: true },
  ]
  await (adminClient as any).from('pipeline_stages').insert(
    defaultStages.map((d) => ({ ...d, organization_id: orgId }))
  )

  // 6. Criar template padrão de proposta (se existir o arquivo global)
  const { data: globalTemplate } = await (adminClient as any).storage
    .from('proposal-templates')
    .download('global/template-padrao.docx')
  if (globalTemplate) {
    const filePath = `${orgId}/template-padrao.docx`
    await (adminClient as any).storage
      .from('proposal-templates')
      .upload(filePath, globalTemplate, {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    await (adminClient as any).from('proposal_templates').insert({
      org_id: orgId,
      name: 'Template Padrão',
      category: 'Residencial e comercial',
      file_path: filePath,
      is_default: true,
      is_active: true,
    })
  }

  return { orgId }
}

'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type CreateOrganizationParams = {
  userId: string
  email: string
  full_name: string
  company_name: string
  cnpj?: string
  phone?: string
  plan?: string
}

/**
 * Cria todos os recursos de uma nova organização, na ordem correta:
 * 1. Perfil do usuário (profiles)
 * 2. Organização (organizations)
 * 3. Vínculo owner (organization_members)
 * 4. Configuração da empresa (org_config)
 * 5. Etapas padrão do funil (pipeline_stages)
 * 6. Template padrão de proposta (opcional)
 *
 * Etapas 1–3 são essenciais: se qualquer uma falhar, desfaz o que já foi criado
 * e lança erro (o chamador remove o auth user). Etapas 4–6 são configuração e
 * não bloqueiam a criação.
 */
export async function createOrganizationResources(
  params: CreateOrganizationParams
): Promise<{ orgId: string }> {
  const { userId, email, full_name, company_name, cnpj, phone, plan = 'professional' } = params

  const admin = createAdminClient()

  // 1. Perfil do usuário
  const { error: profileError } = await (admin as any).from('profiles').upsert({
    id: userId,
    email,
    full_name,
  })
  if (profileError) {
    throw new Error('Erro ao criar perfil: ' + profileError.message)
  }

  // 2. Organização
  const { data: org, error: orgError } = await (admin as any)
    .from('organizations')
    .insert({ name: company_name, plan, status: 'active' })
    .select('id')
    .single()
  if (orgError || !org) {
    throw new Error('Erro ao criar empresa: ' + (orgError?.message ?? 'desconhecido'))
  }
  const orgId: string = org.id

  // 3. Vínculo owner
  const { error: memberError } = await (admin as any)
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: userId,
      role: 'owner',
      permissions: {},
    })
  if (memberError) {
    await (admin as any).from('organizations').delete().eq('id', orgId)
    throw new Error('Erro ao vincular usuário: ' + memberError.message)
  }

  // 4. Configuração da empresa (dados cadastrais)
  await (admin as any).from('org_config').insert({
    organization_id: orgId,
    razao_social: company_name,
    nome_fantasia: company_name,
    cnpj: cnpj || null,
    email,
    telefone: phone ?? null,
  })

  // 5. Etapas padrão do funil de vendas
  const defaultStages = [
    { name: 'Chegada de Leads', order: 1, color: '#6B7A90' },
    { name: 'Follow-up', order: 2, color: '#3B82F6' },
    { name: 'Visita Agendada', order: 3, color: '#F59E0B' },
    { name: 'Proposta Enviada', order: 4, color: '#8B5CF6' },
    { name: 'Negociação', order: 5, color: '#F97316' },
    { name: 'Contrato Assinado', order: 6, color: '#10B981' },
  ]
  await (admin as any).from('pipeline_stages').insert(
    defaultStages.map((d) => ({ ...d, organization_id: orgId }))
  )

  // 6. Template padrão de proposta (opcional — nunca bloqueia)
  try {
    const { data: globalTemplate } = await (admin as any).storage
      .from('proposal-templates')
      .download('global/template-padrao.docx')
    if (globalTemplate) {
      const filePath = `${orgId}/template-padrao.docx`
      await (admin as any).storage.from('proposal-templates').upload(filePath, globalTemplate, {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      await (admin as any).from('proposal_templates').insert({
        org_id: orgId,
        name: 'Template Padrão',
        category: 'Residencial e comercial',
        file_path: filePath,
        is_default: true,
        is_active: true,
      })
    }
  } catch {
    // Template opcional — não bloqueia criação
  }

  return { orgId }
}

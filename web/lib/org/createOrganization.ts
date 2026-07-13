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

const SUPER_ADMIN_ROLE_ID = '9db39e35-0e9b-4617-986f-8b3f7af74db3'

/**
 * Cria a organização completa de forma atômica via função SQL.
 * Se qualquer etapa falhar, o Postgres faz rollback de tudo.
 */
export async function createOrganizationResources(
  params: CreateOrganizationParams
): Promise<{ orgId: string }> {
  const {
    userId,
    email,
    full_name,
    company_name,
    cnpj = '',
    phone,
    plan = 'professional',
  } = params

  const admin = createAdminClient()

  const { data: orgId, error } = await admin.rpc('create_organization_complete', {
    p_company_name: company_name,
    p_cnpj:        cnpj,
    p_email:       email,
    p_phone:       phone ?? null,
    p_plan:        plan,
    p_user_id:     userId,
    p_user_email:  email,
    p_user_name:   full_name,
    p_role_id:     SUPER_ADMIN_ROLE_ID,
  })

  if (error || !orgId) {
    throw new Error('Erro ao criar empresa: ' + (error?.message ?? 'desconhecido'))
  }

  // Template padrão de proposta (opcional — nunca bloqueia)
  try {
    const { data: globalTemplate } = await admin.storage
      .from('proposal-templates')
      .download('global/template-padrao.docx')
    if (globalTemplate) {
      const filePath = `${orgId}/template-padrao.docx`
      await admin.storage.from('proposal-templates').upload(filePath, globalTemplate, {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    // Template opcional — não bloqueia criação
  }

  return { orgId }
}

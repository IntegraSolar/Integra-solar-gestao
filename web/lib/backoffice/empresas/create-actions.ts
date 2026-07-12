'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createOrganizationResources } from '@/lib/org/createOrganization'
import { getCurrentPlatformUser } from '@/lib/backoffice/auth/getCurrentPlatformUser'

export type NovaEmpresaInput = {
  company_name: string
  full_name: string
  email: string
  phone?: string
  plan?: 'starter' | 'professional' | 'enterprise'
}

export type NovaEmpresaResult = {
  error?: string
  success?: string
  orgId?: string
}

export async function criarNovaEmpresa(input: NovaEmpresaInput): Promise<NovaEmpresaResult> {
  const platformUser = await getCurrentPlatformUser()
  if (!platformUser) return { error: 'Sessão administrativa inválida.' }

  const { company_name, full_name, email, phone, plan = 'professional' } = input

  if (!company_name?.trim()) return { error: 'Nome da empresa é obrigatório.' }
  if (!full_name?.trim()) return { error: 'Nome do responsável é obrigatório.' }
  if (!email?.trim()) return { error: 'E-mail é obrigatório.' }

  const adminClient = createAdminClient()

  // Envia convite por e-mail — o usuário define a própria senha ao clicar no link
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { full_name: full_name.trim() },
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
        : undefined,
    }
  )

  if (inviteError || !inviteData?.user) {
    // E-mail já cadastrado é o erro mais comum
    const msg = inviteError?.message ?? 'Erro ao criar convite.'
    if (msg.toLowerCase().includes('already')) {
      return { error: 'Este e-mail já possui uma conta na plataforma.' }
    }
    return { error: msg }
  }

  const userId = inviteData.user.id

  try {
    const { orgId } = await createOrganizationResources({
      userId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      company_name: company_name.trim(),
      phone: phone?.trim() || undefined,
      plan,
    })

    return { success: `Empresa criada com sucesso! Convite enviado para ${email}.`, orgId }
  } catch (err: any) {
    // Rollback: remove o auth user se a org falhou
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err?.message ?? 'Erro ao criar organização.' }
  }
}

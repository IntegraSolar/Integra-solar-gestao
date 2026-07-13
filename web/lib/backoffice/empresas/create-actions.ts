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
  password?: string
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

  let userId: string

  if (password?.trim()) {
    // Cria o usuário com senha definida — acesso imediato, sem e-mail de convite
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    })

    if (createError || !createData?.user) {
      const msg = createError?.message ?? 'Erro ao criar usuário.'
      if (msg.toLowerCase().includes('already')) {
        return { error: 'Este e-mail já possui uma conta na plataforma.' }
      }
      return { error: msg }
    }

    userId = createData.user.id
  } else {
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
      const msg = inviteError?.message ?? 'Erro ao criar convite.'
      if (msg.toLowerCase().includes('already')) {
        return { error: 'Este e-mail já possui uma conta na plataforma.' }
      }
      return { error: msg }
    }

    userId = inviteData.user.id
  }

  try {
    const { orgId } = await createOrganizationResources({
      userId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      company_name: company_name.trim(),
      phone: phone?.trim() || undefined,
      plan,
    })

    const successMsg = password?.trim()
      ? `Empresa criada! Acesso imediato com o e-mail ${email}.`
      : `Empresa criada! Convite enviado para ${email}.`
    return { success: successMsg, orgId }
  } catch (err: unknown) {
    // Rollback: remove o auth user se a org falhou
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Erro ao criar organização.' }
  }
}

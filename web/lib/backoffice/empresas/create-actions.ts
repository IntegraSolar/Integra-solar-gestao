'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createOrganizationResources } from '@/lib/org/createOrganization'
import { getCurrentPlatformUser } from '@/lib/backoffice/auth/getCurrentPlatformUser'

export type NovaEmpresaInput = {
  company_name: string
  cnpj?: string
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

  const {
    company_name,
    cnpj,
    full_name,
    email,
    phone,
    plan = 'professional',
    password,
  } = input

  if (!company_name?.trim()) return { error: 'Nome da empresa é obrigatório.' }
  if (!full_name?.trim())    return { error: 'Nome do responsável é obrigatório.' }
  if (!email?.trim())        return { error: 'E-mail é obrigatório.' }

  const adminClient = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Criar usuário no Supabase Auth
  //    - Com senha: acesso imediato (email_confirm: true), sem e-mail de convite
  //    - Sem senha: envia convite por e-mail → usuário define a própria senha
  let userId: string

  if (password?.trim()) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    })
    if (error || !data?.user) {
      const msg = error?.message ?? ''
      if (msg.toLowerCase().includes('already')) {
        return { error: 'Este e-mail já possui uma conta na plataforma.' }
      }
      return { error: 'Erro ao criar usuário: ' + msg }
    }
    userId = data.user.id
  } else {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { full_name: full_name.trim() },
        redirectTo: siteUrl ? `${siteUrl}/auth/callback?type=invite&next=/update-password` : undefined,
      }
    )
    if (error || !data?.user) {
      const msg = error?.message ?? ''
      if (msg.toLowerCase().includes('already')) {
        return { error: 'Este e-mail já possui uma conta na plataforma.' }
      }
      return { error: 'Erro ao enviar convite: ' + msg }
    }
    userId = data.user.id
  }

  // 2. Criar organização completa (transação atômica via SQL)
  try {
    const { orgId } = await createOrganizationResources({
      userId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      company_name: company_name.trim(),
      cnpj: cnpj?.trim() || '',
      phone: phone?.trim() || undefined,
      plan,
    })

    const msg = password?.trim()
      ? `Empresa criada com sucesso! Login disponível com o e-mail ${normalizedEmail}.`
      : `Empresa criada! Convite enviado para ${normalizedEmail}.`

    return { success: msg, orgId }
  } catch (err) {
    // Rollback: remove o auth user se a criação da org falhou
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Erro ao criar organização.' }
  }
}

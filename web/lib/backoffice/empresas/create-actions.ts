'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrganizationResources } from '@/lib/org/createOrganization'
import { getCurrentPlatformUser } from '@/lib/backoffice/auth/getCurrentPlatformUser'
import { newRequestId, logStart, logOk, reportError } from '@/lib/observability'

const novaEmpresaSchema = z.object({
  company_name: z.string().trim().min(2, 'Nome da empresa é obrigatório.'),
  full_name: z.string().trim().min(2, 'Nome do responsável é obrigatório.'),
  email: z.string().trim().email('E-mail inválido.'),
  phone: z.string().trim().optional(),
  cnpj: z.string().trim().optional(),
  plan: z.enum(['starter', 'professional', 'enterprise']).optional(),
  password: z.string().min(8, 'A senha inicial deve ter ao menos 8 caracteres.').optional().or(z.literal('')),
})

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

  const parsed = novaEmpresaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    company_name,
    cnpj,
    full_name,
    email,
    phone,
    plan = 'professional',
    password,
  } = parsed.data

  const ctx = {
    requestId: newRequestId(),
    module: 'backoffice.empresas',
    action: 'criarNovaEmpresa',
    user: platformUser.id,
  }
  logStart(ctx, { modo: password?.trim() ? 'senha' : 'convite' })

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

    logOk(ctx, { tenant: orgId })

    const msg = password?.trim()
      ? `Empresa criada com sucesso! Login disponível com o e-mail ${normalizedEmail}.`
      : `Empresa criada! Convite enviado para ${normalizedEmail}.`

    return { success: msg, orgId }
  } catch (err) {
    reportError(ctx, err, { userId })
    // Rollback: remove o auth user se a criação da org falhou
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Erro ao criar organização.' }
  }
}

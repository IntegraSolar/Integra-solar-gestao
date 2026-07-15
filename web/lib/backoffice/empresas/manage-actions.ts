'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySession, SESSION_COOKIE } from '@/lib/backoffice/auth/session'
import { requireBackofficeSession } from '@/lib/backoffice/auth/getCurrentPlatformUser'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/backoffice/auditoria/queries'
import { getOwnerInfo, type OrgConfig } from './queries'
import { newRequestId, logOk, reportError } from '@/lib/observability'

const novoUsuarioSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório.'),
  email: z.string().trim().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
  role: z.enum(['owner', 'admin', 'member']),
})

async function getAdminName(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return 'Desconhecido'
  const session = await verifySession(token)
  return session?.name ?? 'Desconhecido'
}

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s + '@1'
}

// ── 1. Editar dados cadastrais (org_config) ────────────────────────────────
export async function atualizarCadastro(orgId: string, data: OrgConfig): Promise<{ error?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('org_config').select('id').eq('organization_id', orgId).maybeSingle()

  const payload = { ...data, updated_at: new Date().toISOString() }
  let error
  if (existing) {
    ({ error } = await admin.from('org_config').update(payload).eq('organization_id', orgId))
  } else {
    ({ error } = await admin.from('org_config').insert({ ...payload, organization_id: orgId }))
  }
  if (error) return { error: error.message }

  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'editar_cadastro', description: 'Dados cadastrais atualizados.',
  }).catch(() => null)

  revalidatePath(`/backoffice/empresas/${orgId}`)
  return {}
}

// ── 2. Redefinir senha do responsável ──────────────────────────────────────
export async function redefinirSenhaResponsavel(
  orgId: string,
  novaSenha?: string
): Promise<{ error?: string; password?: string; email?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const owner = await getOwnerInfo(orgId)
  if (!owner) return { error: 'Empresa sem responsável vinculado.' }

  const senha = novaSenha?.trim() || gerarSenha()
  if (senha.length < 8) return { error: 'A senha deve ter ao menos 8 caracteres.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(owner.userId, { password: senha })
  if (error) return { error: error.message }

  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'redefinir_senha', description: `Senha do responsável (${owner.email}) redefinida.`,
  }).catch(() => null)

  return { password: senha, email: owner.email }
}

// ── 3. Gerenciar usuários da empresa ───────────────────────────────────────
export async function adicionarUsuario(
  orgId: string,
  input: { name: string; email: string; password: string; role: string }
): Promise<{ error?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const parsed = novoUsuarioSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { name, email, password, role } = parsed.data

  const admin = createAdminClient()
  const normEmail = email.trim().toLowerCase()

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: normEmail, password: password.trim(), email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })
  if (authErr || !created?.user) {
    const m = authErr?.message ?? ''
    if (m.toLowerCase().includes('already')) return { error: 'Este e-mail já possui conta.' }
    return { error: 'Erro ao criar usuário: ' + m }
  }
  const userId = created.user.id

  await admin.from('profiles').upsert({ id: userId, email: normEmail, full_name: name.trim() })
  const { error: memberErr } = await admin.from('organization_members').insert({
    organization_id: orgId, user_id: userId, role: role || 'member', permissions: {},
  })
  if (memberErr) {
    await admin.auth.admin.deleteUser(userId)
    return { error: 'Erro ao vincular usuário: ' + memberErr.message }
  }

  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'adicionar_usuario', description: `Usuário ${name.trim()} (${normEmail}) adicionado como ${role}.`,
  }).catch(() => null)

  revalidatePath(`/backoffice/empresas/${orgId}`)
  return {}
}

export async function removerUsuario(
  orgId: string,
  memberId: string,
  userId: string
): Promise<{ error?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const admin = createAdminClient()

  // Não permitir remover o último owner
  const { data: members } = await admin
    .from('organization_members').select('id, role').eq('organization_id', orgId)
  const alvo = members?.find((m) => m.id === memberId)
  if (alvo?.role === 'owner') {
    const owners = members?.filter((m) => m.role === 'owner') ?? []
    if (owners.length <= 1) return { error: 'Não é possível remover o único responsável (owner) da empresa.' }
  }

  const { error } = await admin.from('organization_members').delete().eq('id', memberId)
  if (error) return { error: error.message }
  await admin.auth.admin.deleteUser(userId).catch(() => null)

  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'remover_usuario', description: 'Usuário removido da empresa.',
  }).catch(() => null)

  revalidatePath(`/backoffice/empresas/${orgId}`)
  return {}
}

// ── 4. Acessar como a empresa (impersonação) ───────────────────────────────
export async function impersonarEmpresa(orgId: string): Promise<{ error?: string; url?: string }> {
  if (!(await requireBackofficeSession())) return { error: 'Sessão de administrador inválida.' }
  const owner = await getOwnerInfo(orgId)
  if (!owner?.email) return { error: 'Empresa sem responsável para impersonar.' }

  const ctx = { requestId: newRequestId(), module: 'backoffice.empresas', action: 'impersonarEmpresa', tenant: orgId, user: owner.userId }
  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: owner.email,
    options: { redirectTo: siteUrl ? `${siteUrl}/dashboard` : undefined },
  })
  if (error || !data?.properties?.action_link) {
    return { error: 'Não foi possível gerar o acesso: ' + reportError(ctx, error ?? new Error('sem action_link')) }
  }

  // Evento de segurança — sempre registrado (auditoria + log estruturado)
  logOk(ctx)
  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'impersonar_empresa', description: `Acesso como responsável (${owner.email}).`,
  }).catch(() => null)

  return { url: data.properties.action_link }
}

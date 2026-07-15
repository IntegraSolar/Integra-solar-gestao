// web/lib/colaboradores/actions.ts
'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserData } from '@/lib/org/queries'
import { requirePermission } from '@/lib/org/permissions'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

type CreateColaboradorData = {
  full_name: string
  email: string
  password: string
  role: string
  permissions: Record<string, unknown>
}

export async function createColaborador(data: CreateColaboradorData): Promise<ActionResult> {
  try { await requirePermission('configuracoes', 'add') } catch { return { error: 'Sem permissão para adicionar colaboradores.' } }
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!data.email || !data.password || !data.full_name) {
    return { error: 'Nome, e-mail e senha são obrigatórios.' }
  }
  // Valida o papel contra o enum permitido (evita valor arbitrário / escalonamento).
  const ROLES = ['admin', 'gerente', 'vendedor', 'instalador', 'projetista']
  if (!ROLES.includes(data.role)) {
    return { error: 'Papel de colaborador inválido.' }
  }
  if (data.password.length < 8) {
    return { error: 'A senha deve ter ao menos 8 caracteres.' }
  }

  const adminClient = createAdminClient()

  // 0. Verificar conflito de e-mail entre organizações
  // Buscar se já existe um auth user com este e-mail
  const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers()
  const existingUser = existingUsers.find((u) => u.email === data.email)

  if (existingUser) {
    // Verificar se já é membro desta mesma organização
    const { data: sameMember } = await (adminClient as any)
      .from('organization_members')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (sameMember) {
      return { error: 'Este colaborador já está cadastrado. Para reativá-lo, utilize a opção de reativação.' }
    }

    // Existe em outra organização
    return { error: 'Este e-mail já está vinculado a outra empresa na plataforma.' }
  }

  // 1. Criar auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  })

  if (authError) return { error: authError.message }
  const newUserId = authData.user.id

  // 2. Inserir profile (via admin para bypass RLS)
  const { error: profileError } = await (adminClient as any).from('profiles').upsert({
    id: newUserId,
    email: data.email,
    full_name: data.full_name,
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUserId)
    return { error: 'Erro ao criar perfil: ' + profileError.message }
  }

  // 3. Inserir organization_member (via admin para bypass RLS)
  const { error: memberError } = await (adminClient as any).from('organization_members').insert({
    organization_id: orgId,
    user_id: newUserId,
    role: data.role,
    permissions: data.permissions,
  })

  if (memberError) {
    await (adminClient as any).from('profiles').delete().eq('id', newUserId)
    await adminClient.auth.admin.deleteUser(newUserId)
    return { error: 'Erro ao vincular à organização: ' + memberError.message }
  }

  await logAction('Colaborador criado', `Nome: ${data.full_name}, E-mail: ${data.email}`)
  revalidatePath('/configuracoes')
  return { success: 'Colaborador criado com sucesso.' }
}

export async function resetColaboradorPassword(
  userId: string
): Promise<ActionResult & { newPassword?: string }> {
  try { await requirePermission('configuracoes', 'edit') } catch { return { error: 'Sem permissão para redefinir senhas.' } }

  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const adminClient = createAdminClient()

  // Isolamento de tenant: o alvo precisa pertencer à organização do solicitante.
  // Sem esta checagem, um admin poderia redefinir a senha de usuários de OUTRA
  // empresa passando um userId arbitrário (IDOR → account takeover).
  const { data: member } = await (adminClient as any)
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!member) return { error: 'Colaborador não encontrado.' }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(10)
  const newPassword = Array.from(bytes).map(b => chars[b % chars.length]).join('')

  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })

  if (error) return { error: 'Erro ao redefinir senha: ' + error.message }
  await logAction('Senha de colaborador redefinida', `User ID: ${userId}`)
  return { success: 'Senha redefinida.', newPassword }
}

export async function updateColaboradorPermissions(
  memberId: string,
  permissions: Record<string, unknown>
): Promise<ActionResult> {
  try { await requirePermission('configuracoes', 'edit') } catch { return { error: 'Sem permissão para editar permissões.' } }
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const adminClient = createAdminClient()

  // Verificar que o membro pertence à organização do usuário autenticado
  const { data: member } = await (adminClient as any)
    .from('organization_members')
    .select('id')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!member) return { error: 'Colaborador não encontrado.' }

  const { error } = await (adminClient as any)
    .from('organization_members')
    .update({ permissions })
    .eq('id', memberId)

  if (error) return { error: error.message }
  await logAction('Permissões de colaborador atualizadas', `Member ID: ${memberId}`)
  revalidatePath('/configuracoes')
  return { success: 'Permissões atualizadas.' }
}

export async function removeColaborador(memberId: string, userId: string): Promise<ActionResult> {
  try { await requirePermission('configuracoes', 'delete') } catch { return { error: 'Sem permissão para remover colaboradores.' } }
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const adminClient = createAdminClient()

  // Verificar que o membro pertence à organização do usuário autenticado
  const { data: member } = await (adminClient as any)
    .from('organization_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!member) return { error: 'Colaborador não encontrado.' }

  const { error } = await (adminClient as any)
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }

  await (adminClient as any).from('profiles').delete().eq('id', userId)
  await adminClient.auth.admin.deleteUser(userId)

  await logAction('Colaborador removido', `Member ID: ${memberId}, User ID: ${userId}`)
  revalidatePath('/configuracoes')
  return { success: 'Colaborador removido.' }
}

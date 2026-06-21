// web/lib/colaboradores/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserData } from '@/lib/org/queries'
import type { ActionResult } from '@/lib/crm/types'

type CreateColaboradorData = {
  full_name: string
  email: string
  password: string
  role: string
  permissions: Record<string, unknown>
}

export async function createColaborador(data: CreateColaboradorData): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!data.email || !data.password || !data.full_name) {
    return { error: 'Nome, e-mail e senha são obrigatórios.' }
  }

  const adminClient = createAdminClient()

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

  revalidatePath('/configuracoes')
  return { success: 'Colaborador criado com sucesso.' }
}

export async function resetColaboradorPassword(
  userId: string
): Promise<ActionResult & { newPassword?: string }> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let newPassword = ''
  for (let i = 0; i < 10; i++) newPassword += chars[Math.floor(Math.random() * chars.length)]

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })

  if (error) return { error: 'Erro ao redefinir senha: ' + error.message }
  return { success: 'Senha redefinida.', newPassword }
}

export async function updateColaboradorPermissions(
  memberId: string,
  permissions: Record<string, unknown>
): Promise<ActionResult> {
  const adminClient = createAdminClient()
  const { error } = await (adminClient as any)
    .from('organization_members')
    .update({ permissions })
    .eq('id', memberId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Permissões atualizadas.' }
}

export async function removeColaborador(memberId: string, userId: string): Promise<ActionResult> {
  const adminClient = createAdminClient()

  const { error } = await (adminClient as any)
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }

  await (adminClient as any).from('profiles').delete().eq('id', userId)
  await adminClient.auth.admin.deleteUser(userId)

  revalidatePath('/configuracoes')
  return { success: 'Colaborador removido.' }
}

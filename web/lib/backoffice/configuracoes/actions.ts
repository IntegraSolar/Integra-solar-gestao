'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireBackofficeSession } from '@/lib/backoffice/auth/getCurrentPlatformUser'
import { revalidatePath } from 'next/cache'

export type BackofficeUser = {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'support'
  created_at: string
}

export async function listarAdmins(): Promise<BackofficeUser[]> {
  if (!(await requireBackofficeSession())) return []
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error || !data) return []

  return data.users
    .filter((u) => u.app_metadata?.is_backoffice === true)
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      name: (u.app_metadata?.backoffice_name as string) ?? u.email ?? '',
      role: (u.app_metadata?.backoffice_role as BackofficeUser['role']) ?? 'support',
      created_at: u.created_at,
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export async function criarAdmin(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const session = await requireBackofficeSession()
  if (!session) return { error: 'Sessão de administrador inválida.' }
  if (session.role !== 'super_admin') return { error: 'Apenas super administradores podem gerenciar administradores da plataforma.' }

  const email = formData.get('email')?.toString().trim()
  const name  = formData.get('name')?.toString().trim()
  const role  = formData.get('role')?.toString() as BackofficeUser['role']
  const password = formData.get('password')?.toString()

  if (!email || !name || !role || !password) return { error: 'Preencha todos os campos.' }
  if (password.length < 8) return { error: 'Senha deve ter ao menos 8 caracteres.' }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      is_backoffice: true,
      backoffice_role: role,
      backoffice_name: name,
    },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Erro ao criar usuário.' }

  revalidatePath('/backoffice/configuracoes')
  return { success: true }
}

export async function removerAdmin(id: string): Promise<{ error?: string }> {
  const session = await requireBackofficeSession()
  if (!session) return { error: 'Sessão de administrador inválida.' }
  if (session.role !== 'super_admin') return { error: 'Apenas super administradores podem gerenciar administradores da plataforma.' }
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { error: error.message }
  revalidatePath('/backoffice/configuracoes')
  return {}
}

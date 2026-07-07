'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from './session'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
})

type ActionResult = { error?: string }

export async function signInBackoffice(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { email, password } = parsed.data
  const admin = createAdminClient()

  // 1. Verificar credenciais via Supabase Auth (sem depender de RPC/PostgREST)
  const { data: authData, error: authError } = await admin.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  })

  if (authError || !authData.user) {
    return { error: 'E-mail ou senha incorretos.' }
  }

  // 2. Confirmar que o usuário está autorizado no backoffice (platform_users)
  const { data: platformUser, error: platformError } = await admin
    .from('platform_users_public')
    .select('id, email, name, role, is_active')
    .eq('email', email.toLowerCase())
    .single()

  if (platformError || !platformUser || !platformUser.is_active) {
    return { error: 'Acesso não autorizado ao backoffice.' }
  }

  // 3. Criar sessão JWT própria (independente da sessão Supabase)
  const token = await signSession({
    id: platformUser.id,
    email: platformUser.email,
    name: platformUser.name,
    role: platformUser.role as 'super_admin' | 'admin' | 'support',
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/backoffice',
    maxAge: SESSION_MAX_AGE,
  })

  redirect('/backoffice/dashboard')
}

export async function signOutBackoffice(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/backoffice/login')
}

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
  // 1. Verificar credenciais com o client anon (funciona corretamente para signIn)
  const { createClient } = await import('@supabase/supabase-js')
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  })

  if (authError || !authData.user) {
    return { error: `[auth] ${authError?.message ?? 'sem usuário'}` }
  }

  // 2. Confirmar que o usuário está autorizado no backoffice (platform_users)
  const admin = createAdminClient()
  const { data: platformUser, error: platformError } = await admin
    .from('platform_users_public')
    .select('id, email, name, role, is_active')
    .eq('email', email.toLowerCase())
    .single()

  if (platformError || !platformUser || !platformUser.is_active) {
    return { error: `[platform] ${platformError?.message ?? 'não encontrado ou inativo'}` }
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

'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
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

  // 1. Autenticar via Supabase Auth (anon key)
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
    return { error: 'E-mail ou senha incorretos.' }
  }

  // 2. Verificar autorização via app_metadata (sem query ao DB)
  const meta = authData.user.app_metadata ?? {}
  if (!meta.is_backoffice) {
    return { error: 'Acesso não autorizado ao backoffice.' }
  }

  // 3. Criar sessão JWT própria
  const token = await signSession({
    id: authData.user.id,
    email: authData.user.email!,
    name: (meta.backoffice_name as string) ?? authData.user.email!,
    role: (meta.backoffice_role as 'super_admin' | 'admin' | 'support') ?? 'support',
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

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
  const { data, error } = await admin.rpc('verify_platform_user', {
    p_email: email.toLowerCase(),
    p_password: password,
  })

  if (error || !data || (data as unknown[]).length === 0) {
    return { error: 'E-mail ou senha incorretos.' }
  }

  const user = (data as Array<{ id: string; email: string; name: string; role: string }>)[0]

  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'super_admin' | 'admin' | 'support',
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

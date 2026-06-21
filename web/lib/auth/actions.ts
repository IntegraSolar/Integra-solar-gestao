'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ── Schemas de validação ──────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
})

const resetSchema = z.object({
  email: z.string().email('E-mail inválido.'),
})

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

// ── Tipos de retorno ──────────────────────────────────────────────

type ActionResult = {
  error?: string
  success?: string
}

// ── Login ─────────────────────────────────────────────────────────

export async function signIn(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { error: 'E-mail ou senha incorretos.' }
    }
    return { error: error.message }
  }

  const next = '/dashboard'
  revalidatePath('/', 'layout')
  redirect(next)
}

// ── Logout ────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// ── Solicitar reset de senha ──────────────────────────────────────

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl}/update-password` }
  )

  if (error) {
    return { error: error.message }
  }

  // Sempre retornar sucesso (não revelar se e-mail existe)
  return { success: 'Se este e-mail estiver cadastrado, você receberá um link em instantes.' }
}

// ── Definir nova senha (via link de email) ────────────────────────

export async function updatePassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

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

// ── Registro de nova empresa ──────────────────────────────────────

const registerSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa é obrigatório.'),
  full_name: z.string().min(2, 'Nome completo é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
})

export async function registerCompany(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    company_name: formData.get('company_name'),
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { company_name, full_name, email, phone, password } = parsed.data

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  // 1. Criar auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: authError.message }
  }

  const userId = authData.user.id

  // 2–5. Criar organização e todos os recursos associados
  const { createOrganizationResources } = await import('@/lib/org/createOrganization')
  try {
    await createOrganizationResources({ userId, email, full_name, company_name, phone })
  } catch (err) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Erro ao configurar empresa.' }
  }

  // 6. Fazer login automático
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
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

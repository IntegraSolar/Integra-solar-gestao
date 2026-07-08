'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { checkBruteForce, recordLoginAttempt, isNewDevice, recordSession } from '@/lib/auth/brute-force'

// ── Schemas de validação ─────────────────────────────────────────────────────

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
})

const resetSchema = z.object({
  email: z.string().email('E-mail inválido.'),
})

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres.')
    .regex(PASSWORD_REGEX, 'A senha precisa ter maiúscula, minúscula e número.'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

const registerSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa é obrigatório.'),
  full_name: z.string().min(2, 'Nome completo é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres.')
    .regex(PASSWORD_REGEX, 'A senha precisa ter maiúscula, minúscula e número.'),
})

// ── Tipos de retorno ─────────────────────────────────────────────────────────

type ActionResult = {
  error?: string
  success?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getClientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '0.0.0.0'
  )
}

async function getUA(): Promise<string> {
  const h = await headers()
  return h.get('user-agent') ?? 'unknown'
}

// ── Login ────────────────────────────────────────────────────────────────────

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

  const { email, password } = parsed.data
  const rememberMe = formData.get('remember_me') === '1'
  const ip = await getClientIp()
  const ua = await getUA()

  // Proteção brute-force
  const bf = await checkBruteForce(email, ip)
  if (bf.blocked) return { error: bf.message }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await recordLoginAttempt({ identifier: email.toLowerCase(), kind: 'email', success: false })
    await recordLoginAttempt({ identifier: ip, kind: 'ip', success: false })
    return { error: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.' }
  }

  const user = data.user
  const session = data.session

  const newDevice = await isNewDevice(user.id, ua, ip)

  await recordSession({
    userId: user.id,
    organizationId: null,
    sessionToken: session?.access_token ?? crypto.randomUUID(),
    userAgent: ua,
    ip,
    rememberMe,
  })

  // Notificação de novo dispositivo em background
  if (newDevice && user.email) {
    const { sendNewDeviceLoginEmail } = await import('@/lib/email/resend')
    const name = (user.user_metadata?.full_name as string) || user.email
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const parsed2 = parseUA(ua)

    sendNewDeviceLoginEmail({
      to: user.email,
      name,
      device: parsed2.device,
      browser: parsed2.browser,
      ip,
      time: now,
    }).catch(() => null)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

function parseUA(ua: string) {
  let browser = 'Navegador'
  let device = 'Desktop'
  if (ua.includes('Mobile')) device = 'Mobile'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'
  return { browser, device }
}

// ── Registro de nova empresa ─────────────────────────────────────────────────

export async function registerCompany(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ip = await getClientIp()

  // Rate limit por IP: 3 registros/hora
  const ok = await rateLimit(`register_ip:${ip}`, 3, 60 * 60 * 1000)
  if (!ok) {
    return { error: 'Muitas tentativas de cadastro a partir deste endereço. Tente em 1 hora.' }
  }

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

  // email_confirm: false → Supabase envia e-mail de confirmação
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  const userId = authData.user.id

  const { createOrganizationResources } = await import('@/lib/org/createOrganization')
  try {
    await createOrganizationResources({ userId, email, full_name, company_name, phone })
  } catch (err) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Erro ao configurar empresa.' }
  }

  // Login automático mesmo sem confirmar e-mail (confirmação será exigida no próximo acesso)
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ── Logout ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// ── Solicitar reset de senha ─────────────────────────────────────────────────

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ip = await getClientIp()

  const ok = await rateLimit(`reset_ip:${ip}`, 5, 60 * 60 * 1000)
  if (!ok) {
    return { error: 'Muitas solicitações. Aguarde antes de tentar novamente.' }
  }

  const parsed = resetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery&next=/update-password`,
  })

  // Sempre retornar sucesso (não revelar se e-mail existe)
  return { success: 'Se este e-mail estiver cadastrado, você receberá um link em instantes.' }
}

// ── Definir nova senha (via link de email) ───────────────────────────────────

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

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: 'Não foi possível atualizar a senha. O link pode ter expirado.' }
  }

  // Invalidar todas as outras sessões após reset
  await supabase.auth.signOut({ scope: 'others' })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

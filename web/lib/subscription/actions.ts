'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error?: string; success?: string }

const PLANS = {
  mensal: { name: 'Mensal', price: 9990, cycle: 'monthly' },
  semestral: { name: 'Semestral', price: 53900, cycle: 'semiannual' },
  anual: { name: 'Anual', price: 99800, cycle: 'annual' },
} as const

const checkoutSchema = z.object({
  plan: z.enum(['mensal', 'semestral', 'anual']),
  payment_method: z.enum(['pix', 'pix_recorrente', 'cartao']),
  company_name: z.string().min(2),
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
})

export async function processCheckout(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { plan, payment_method, company_name, full_name, email, phone, password } = parsed.data
  const planInfo = PLANS[plan]

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) return { error: 'Este e-mail já está cadastrado.' }
    return { error: authError.message }
  }

  const userId = authData.user.id

  // 2–5. Criar organização e todos os recursos associados
  const { createOrganizationResources } = await import('@/lib/org/createOrganization')
  let orgId = ''
  try {
    const result = await createOrganizationResources({ userId, email, full_name, company_name, phone })
    orgId = result.orgId
  } catch (err) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Erro ao configurar empresa.' }
  }

  // 6. Create subscription
  const now = new Date()
  const expiresAt = new Date()
  if (plan === 'mensal') expiresAt.setMonth(now.getMonth() + 1)
  else if (plan === 'semestral') expiresAt.setMonth(now.getMonth() + 6)
  else expiresAt.setFullYear(now.getFullYear() + 1)

  await (adminClient as any).from('subscriptions').insert({
    user_id: userId,
    organization_id: orgId,
    plan: plan,
    billing_cycle: planInfo.cycle,
    payment_method: payment_method,
    provider: payment_method === 'cartao' ? 'stripe' : 'asaas',
    status: 'pending',
    amount: planInfo.price,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  })

  // 7. Auto login
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

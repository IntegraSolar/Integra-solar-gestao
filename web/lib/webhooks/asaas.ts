import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type AsaasEventType =
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_REFUNDED'

export interface AsaasWebhookPayload {
  event: AsaasEventType
  payment: {
    id: string
    customer: string
    value: number
    netValue: number
    description: string
    billingType: string
    status: string
    dueDate: string
    paymentDate?: string
    // set to user_id when creating the Asaas charge
    externalReference?: string
  }
}

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function addCycleDays(from: Date, billingCycle: string): Date {
  const d = new Date(from)
  if (billingCycle === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (billingCycle === 'semiannual') d.setMonth(d.getMonth() + 6)
  else if (billingCycle === 'annual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1) // fallback
  return d
}

async function handlePaymentConfirmed(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const userId = payload.payment.externalReference
  if (!userId) {
    console.warn('[Asaas] PAYMENT_CONFIRMED sem externalReference — ignorado')
    return { success: true, message: 'Sem externalReference, ignorado.' }
  }

  const admin = createAdminClient()

  const { data: sub, error } = await (admin as any)
    .from('subscriptions')
    .select('id, billing_cycle, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !sub) {
    console.error('[Asaas] Subscription não encontrada para user_id:', userId)
    return { success: false, message: 'Subscription não encontrada.' }
  }

  const now = new Date()
  // Renovar a partir de expires_at se ainda no futuro, senão a partir de agora
  const base = sub.expires_at && new Date(sub.expires_at) > now
    ? new Date(sub.expires_at)
    : now

  const newExpiresAt = addCycleDays(base, sub.billing_cycle ?? 'monthly')

  const { error: updateError } = await (admin as any)
    .from('subscriptions')
    .update({
      status: 'active',
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', sub.id)

  if (updateError) {
    console.error('[Asaas] Erro ao atualizar subscription:', updateError.message)
    return { success: false, message: updateError.message }
  }

  console.log('[Asaas] Subscription ativada para user_id:', userId, 'até:', newExpiresAt.toISOString())
  return { success: true, message: 'Subscription ativada.' }
}

async function handlePaymentOverdue(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const userId = payload.payment.externalReference
  if (!userId) return { success: true, message: 'Sem externalReference, ignorado.' }

  const admin = createAdminClient()
  await (admin as any)
    .from('subscriptions')
    .update({ status: 'overdue' })
    .eq('user_id', userId)
    .eq('status', 'active')

  console.log('[Asaas] Subscription marcada como overdue para user_id:', userId)
  return { success: true, message: 'Subscription marcada como overdue.' }
}

async function handlePaymentDeleted(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const userId = payload.payment.externalReference
  if (!userId) return { success: true, message: 'Sem externalReference, ignorado.' }

  const admin = createAdminClient()
  await (admin as any)
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', userId)

  console.log('[Asaas] Subscription cancelada para user_id:', userId)
  return { success: true, message: 'Subscription cancelada.' }
}

export async function dispatchAsaasEvent(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  switch (payload.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      return handlePaymentConfirmed(payload)
    case 'PAYMENT_OVERDUE':
      return handlePaymentOverdue(payload)
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      return handlePaymentDeleted(payload)
    default:
      console.log(`[Asaas] Evento não tratado: ${payload.event}`)
      return { success: true, message: `Evento ${payload.event} ignorado.` }
  }
}

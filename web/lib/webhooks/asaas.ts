import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Tipos de eventos Asaas suportados
export type AsaasEventType = 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED'

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
    externalReference?: string // Usaremos para linkar ao organization_id futuro
  }
}

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Handler para PAYMENT_CONFIRMED ──────────────────────────────
// TODO (fase Asaas): implementar criação de organization + convite ao owner
export async function handlePaymentConfirmed(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  console.log('[Asaas] PAYMENT_CONFIRMED recebido:', {
    paymentId: payload.payment.id,
    value: payload.payment.value,
    externalReference: payload.payment.externalReference,
  })

  // Estrutura futura:
  // 1. Validar externalReference (contém dados do cliente que pagou)
  // 2. Criar organization
  // 3. Criar usuário owner via supabase.auth.admin.inviteUserByEmail()
  // 4. Inserir em organization_members com role 'owner'

  void createAdminClient() // referência para evitar tree-shaking

  return {
    success: true,
    message: 'Evento PAYMENT_CONFIRMED recebido e registrado. Integração Asaas pendente de implementação.',
  }
}

// ── Dispatcher de eventos ─────────────────────────────────────────
export async function dispatchAsaasEvent(
  payload: AsaasWebhookPayload
): Promise<{ success: boolean; message: string }> {
  switch (payload.event) {
    case 'PAYMENT_CONFIRMED':
      return handlePaymentConfirmed(payload)
    default:
      console.log(`[Asaas] Evento não tratado: ${payload.event}`)
      return { success: true, message: `Evento ${payload.event} ignorado.` }
  }
}

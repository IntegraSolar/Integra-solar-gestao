'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySession, SESSION_COOKIE } from '@/lib/backoffice/auth/session'
import { registrarAuditoria } from '@/lib/backoffice/auditoria/queries'
import { getAssinatura } from './queries'

async function getAdminName(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return 'Desconhecido'
  const session = await verifySession(token)
  return session?.name ?? 'Desconhecido'
}

// Descobre o dono (owner) da organização — necessário para subscriptions.user_id
async function getOwnerUserId(orgId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
  if (!data?.length) return null
  const owner = data.find((m) => m.role === 'owner') ?? data[0]
  return owner.user_id
}

function addCycle(from: Date, cycle: string): Date {
  const d = new Date(from)
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

export type SalvarAssinaturaInput = {
  organization_id: string
  plan: string
  billing_cycle: 'monthly' | 'yearly'
  payment_method: string
  amount: number      // centavos
  setup_fee: number   // centavos
  status: string
  expires_at?: string | null // ISO date
}

export async function salvarAssinatura(input: SalvarAssinaturaInput): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const existing = await getAssinatura(input.organization_id)

  const ownerId = await getOwnerUserId(input.organization_id)
  if (!ownerId) return { error: 'A empresa não possui um responsável (owner) vinculado.' }

  const expires = input.expires_at
    ? new Date(input.expires_at).toISOString()
    : addCycle(new Date(), input.billing_cycle).toISOString()

  const payload = {
    organization_id: input.organization_id,
    user_id: ownerId,
    plan: input.plan,
    billing_cycle: input.billing_cycle,
    payment_method: input.payment_method,
    provider: 'manual',
    status: input.status,
    amount: input.amount,
    setup_fee: input.setup_fee,
    expires_at: expires,
    updated_at: new Date().toISOString(),
  }

  let error
  if (existing) {
    ({ error } = await admin.from('subscriptions').update(payload).eq('id', existing.id))
  } else {
    ({ error } = await admin.from('subscriptions').insert({ ...payload, started_at: new Date().toISOString() }))
  }
  if (error) return { error: error.message }

  // Sincroniza plano/status na organização também
  await admin.from('organizations').update({ plan: input.plan, status: input.status === 'active' ? 'active' : input.status }).eq('id', input.organization_id)

  await registrarAuditoria({
    organization_id: input.organization_id,
    user_name: await getAdminName(),
    action: existing ? 'editar_assinatura' : 'criar_assinatura',
    description: `Plano ${input.plan}, ${(input.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/${input.billing_cycle === 'yearly' ? 'ano' : 'mês'}, status ${input.status}`,
  }).catch(() => null)

  revalidatePath(`/backoffice/empresas/${input.organization_id}`)
  revalidatePath('/backoffice/assinaturas')
  return {}
}

export async function renovarAssinatura(orgId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const sub = await getAssinatura(orgId)
  if (!sub) return { error: 'Nenhuma assinatura para renovar.' }

  const base = sub.expires_at && new Date(sub.expires_at) > new Date() ? new Date(sub.expires_at) : new Date()
  const expires = addCycle(base, sub.billing_cycle).toISOString()

  const { error } = await admin
    .from('subscriptions')
    .update({ expires_at: expires, status: 'active', updated_at: new Date().toISOString() })
    .eq('id', sub.id)
  if (error) return { error: error.message }

  await admin.from('organizations').update({ status: 'active', blocked_at: null, blocked_reason: null }).eq('id', orgId)

  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'renovar_assinatura',
    description: `Renovada até ${new Date(expires).toLocaleDateString('pt-BR')}`,
  }).catch(() => null)

  revalidatePath(`/backoffice/empresas/${orgId}`)
  revalidatePath('/backoffice/assinaturas')
  return {}
}

export async function cancelarAssinatura(orgId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const sub = await getAssinatura(orgId)
  if (!sub) return { error: 'Nenhuma assinatura para cancelar.' }

  const { error } = await admin
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', sub.id)
  if (error) return { error: error.message }

  await admin.from('organizations').update({ status: 'canceled' }).eq('id', orgId)

  await registrarAuditoria({
    organization_id: orgId, user_name: await getAdminName(),
    action: 'cancelar_assinatura', description: 'Assinatura cancelada.',
  }).catch(() => null)

  revalidatePath(`/backoffice/empresas/${orgId}`)
  revalidatePath('/backoffice/assinaturas')
  return {}
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { logAction } from '@/lib/auditoria/actions'
import type { ActionResult } from '@/lib/crm/types'

const REMOVED = '[removido]'
const REMOVED_NAME = '[Titular Removido]'

// ── Anonimizar Lead ───────────────────────────────────────────────

export async function anonymizeLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name')
    .eq('id', leadId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!lead) return { error: 'Lead não encontrado.' }

  const { error } = await supabase
    .from('leads')
    .update({
      name: REMOVED_NAME,
      phone: REMOVED,
      city: null,
      observations: null,
    })
    .eq('id', leadId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  await logAction('LGPD: Lead anonimizado', `Lead: ${lead.name} (ID: ${leadId})`)
  return { success: 'Dados do lead anonimizados com sucesso.' }
}

// ── Anonimizar Cliente ────────────────────────────────────────────

export async function anonymizeClient(clientId: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!client) return { error: 'Cliente não encontrado.' }

  const { error } = await supabase
    .from('clients')
    .update({
      name: REMOVED_NAME,
      phone: REMOVED,
      email: REMOVED,
      cpf_cnpj: REMOVED,
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      zip: null,
    } as any)
    .eq('id', clientId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  await logAction('LGPD: Cliente anonimizado', `Cliente: ${client.name} (ID: ${clientId})`)
  return { success: 'Dados do cliente anonimizados com sucesso.' }
}

// ── Buscar para LGPD ──────────────────────────────────────────────

export type LgpdSearchResult = {
  id: string
  type: 'lead' | 'cliente'
  name: string
  phone: string | null
  created_at: string
}

export async function searchForLgpd(query: string): Promise<LgpdSearchResult[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId || query.trim().length < 2) return []

  const supabase = await createClient()
  const q = `%${query.trim()}%`

  const [leadsRes, clientsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, phone, created_at')
      .eq('organization_id', orgId)
      .ilike('name', q)
      .limit(10),
    supabase
      .from('clients')
      .select('id, name, phone, created_at')
      .eq('organization_id', orgId)
      .ilike('name', q)
      .limit(10),
  ])

  const leads: LgpdSearchResult[] = (leadsRes.data ?? []).map((l: any) => ({
    id: l.id,
    type: 'lead',
    name: l.name,
    phone: l.phone,
    created_at: l.created_at,
  }))

  const clients: LgpdSearchResult[] = (clientsRes.data ?? []).map((c: any) => ({
    id: c.id,
    type: 'cliente',
    name: c.name,
    phone: c.phone,
    created_at: c.created_at,
  }))

  return [...leads, ...clients].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

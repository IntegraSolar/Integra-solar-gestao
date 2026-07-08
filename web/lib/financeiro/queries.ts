// web/lib/financeiro/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getMonthDateRange, getMonthRangeBRT } from '@/lib/utils/date-range'

export type FinanceiroInstallment = {
  id: string
  client_id: string
  client_name: string
  position: number
  due_date: string
  amount: number
  notes: string | null
  status: 'pendente' | 'confirmada'
  confirmed_at: string | null
  payment_proof_url: string | null
}

export type FinanceiroPainel = {
  faturamento_total: number
  a_receber: number
  em_atraso: number
  installments: FinanceiroInstallment[]
}

export type FinanceiroMember = {
  id: string
  full_name: string | null
  email: string
}

export async function getFinanceiroMembers(): Promise<FinanceiroMember[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id, profiles:profiles(id, full_name, email)')
    .eq('organization_id', user.membership.organization.id)
  return ((data ?? []) as any[]).map((m) => m.profiles).filter(Boolean) as FinanceiroMember[]
}

export async function getFinanceiroPainel(params: {
  month: number
  year: number
  vendedorId?: string
  dateField?: 'due_date' | 'payment_date'
}): Promise<FinanceiroPainel> {
  const user = await getCurrentUserData()
  if (!user?.membership) return { faturamento_total: 0, a_receber: 0, em_atraso: 0, installments: [] }

  const supabase = await createClient()
  const orgId = user.membership.organization.id
  const dateField = params.dateField ?? 'due_date'

  let query = supabase
    .from('client_installments')
    .select(`
      id, client_id, position, due_date, amount, notes, status, confirmed_at, payment_proof_url,
      client:clients!client_id(id, name)
    `)
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true })

  if (dateField === 'payment_date') {
    // confirmed_at é timestamptz — usa intervalo BRT em UTC
    const { startISO, endISO } = getMonthRangeBRT(params.month, params.year)
    query = query.gte('confirmed_at', startISO).lte('confirmed_at', endISO)
  } else {
    // due_date é date — string comparison funciona corretamente
    const { startDate, endDate } = getMonthDateRange(params.month, params.year)
    query = query.gte('due_date', startDate).lte('due_date', endDate)
  }

  const { data } = await query
  let installments = (data ?? []) as any[]

  // Filter by vendedor (JOIN via clients.lead_id → leads.assigned_to_user_id)
  if (params.vendedorId) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('assigned_to_user_id', params.vendedorId)
      .eq('organization_id', orgId)
    const leadIds = ((leads ?? []) as any[]).map((l) => l.id)

    if (leadIds.length > 0) {
      const { data: clientsForVendedor } = await supabase
        .from('clients')
        .select('id')
        .in('lead_id', leadIds)
      const clientIds = new Set(((clientsForVendedor ?? []) as any[]).map((c) => c.id))
      installments = installments.filter((i) => clientIds.has(i.client_id))
    } else {
      installments = []
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const normalized: FinanceiroInstallment[] = installments.map((i) => ({
    id: i.id,
    client_id: i.client_id,
    client_name: Array.isArray(i.client) ? (i.client[0]?.name ?? 'Cliente') : (i.client?.name ?? 'Cliente'),
    position: i.position,
    due_date: i.due_date,
    amount: Number(i.amount),
    notes: i.notes ?? null,
    status: i.status as 'pendente' | 'confirmada',
    confirmed_at: i.confirmed_at ?? null,
    payment_proof_url: i.payment_proof_url ?? null,
  }))

  return {
    faturamento_total: normalized.reduce((sum, i) => sum + i.amount, 0),
    a_receber: normalized
      .filter((i) => i.status === 'pendente' && i.due_date >= today)
      .reduce((sum, i) => sum + i.amount, 0),
    em_atraso: normalized
      .filter((i) => i.status === 'pendente' && i.due_date < today)
      .reduce((sum, i) => sum + i.amount, 0),
    installments: normalized,
  }
}

export async function getParcelasByClient(clientId: string): Promise<FinanceiroInstallment[]> {
  const user = await getCurrentUserData()
  if (!user?.membership) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('client_installments')
    .select('id, client_id, position, due_date, amount, notes, status, confirmed_at, payment_proof_url, clients!client_id(name)')
    .eq('client_id', clientId)
    .eq('organization_id', user.membership.organization.id)
    .order('position', { ascending: true })

  const clientName = (data as any)?.[0]?.clients?.name ?? 'Cliente'

  return ((data ?? []) as any[]).map((i) => ({
    id: i.id,
    client_id: clientId,
    client_name: clientName,
    position: i.position,
    due_date: i.due_date,
    amount: Number(i.amount),
    notes: i.notes ?? null,
    status: i.status as 'pendente' | 'confirmada',
    confirmed_at: i.confirmed_at ?? null,
    payment_proof_url: i.payment_proof_url ?? null,
  }))
}

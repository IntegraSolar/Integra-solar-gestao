// web/lib/financeiro/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getMonthDateRange, getMonthRangeBRT, getTodayBRT } from '@/lib/utils/date-range'
import { computeFinanceiroTotais } from './totais'

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
  recebido: number
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
  if (!user?.membership) {
    return { faturamento_total: 0, recebido: 0, a_receber: 0, em_atraso: 0, installments: [] }
  }

  const supabase = await createClient()
  const orgId = user.membership.organization.id
  const dateField = params.dateField ?? 'due_date'

  // Busca todas as parcelas da org: os cards são globais (um atraso de meses
  // anteriores precisa continuar visível). O recorte de mês é aplicado depois,
  // apenas sobre a lista exibida.
  const { data } = await supabase
    .from('client_installments')
    .select(`
      id, client_id, position, due_date, amount, notes, status, confirmed_at, payment_proof_url,
      client:clients!client_id(id, name)
    `)
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true })

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

  // Cards: globais, sobre todas as parcelas da org
  const totais = computeFinanceiroTotais(normalized, getTodayBRT())

  // Lista: apenas as parcelas do mês/ano selecionado
  const listadas = normalized.filter((i) => {
    if (dateField === 'payment_date') {
      if (!i.confirmed_at) return false
      const { startISO, endISO } = getMonthRangeBRT(params.month, params.year)
      return i.confirmed_at >= startISO && i.confirmed_at <= endISO
    }
    const { startDate, endDate } = getMonthDateRange(params.month, params.year)
    return i.due_date >= startDate && i.due_date <= endDate
  })

  return { ...totais, installments: listadas }
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

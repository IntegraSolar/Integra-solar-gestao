// web/lib/dashboard/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type PipelineCard = {
  label: string
  href: string
  total: number
  pending: number
  color: string
}

export type KpiData = {
  qtd_vendas: number
  valor_total: number
  potencia_kwp: number
  ticket_medio: number
}

export type FaturamentoMes = {
  mes: string
  label: string
  ano_atual: number
  ano_anterior: number
}

export type LeadOrigemItem = {
  name: string
  count: number
}

export type MetaData = {
  meta_anual: number
  meta_mensal: number
  realizado_mes: number
  realizado_ano: number
}

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

async function getOrgId() {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

// ── Pipeline Cards ──────────────────────────────────────────────

export async function getPipelineCards(): Promise<PipelineCard[]> {
  const orgId = await getOrgId()
  if (!orgId) return []

  const supabase = await createClient()

  async function countTable(table: string): Promise<number> {
    const { count } = await (supabase as any).from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
    return count ?? 0
  }

  async function countByStatus(table: string, field: string, values: string[]): Promise<number> {
    const { count } = await (supabase as any).from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in(field, values)
    return count ?? 0
  }

  const now = new Date().toISOString()
  const today = now.split('T')[0]

  const [
    leadsTotal, leadsPending,
    contratosTotal, contratosPending,
    finClients, finPending,
    projTotal, projPending,
    compTotal, compPending,
    comTotal, comPending,
    entregaTotal, entregaPending,
    obraTotal, obraPending,
    entregaObraTotal, entregaObraPending,
    posObraTotal, posObraPending,
  ] = await Promise.all([
    // Leads: total ativos
    (async () => {
      const { count } = await (supabase as any).from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('converted', false)
      return count ?? 0
    })(),
    // Leads pendentes: follow-ups atrasados OU sem movimentação há 7+ dias
    (async () => {
      const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString()

      // Leads com follow-ups atrasados
      const { data: followupLeads } = await (supabase as any)
        .from('tasks')
        .select('related_to_lead_id')
        .eq('organization_id', orgId)
        .is('completed_at', null)
        .lt('due_date', now)
      const leadsComFollowupAtrasado = new Set((followupLeads ?? []).map((r: any) => r.related_to_lead_id).filter(Boolean))

      // Leads sem movimentação há 7+ dias
      const { data: leadsInativos } = await (supabase as any)
        .from('leads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('converted', false)
        .lt('updated_at', seteDiasAtras)
      const leadsSemMovimentacao = new Set((leadsInativos ?? []).map((r: any) => r.id))

      leadsSemMovimentacao.forEach((id) => leadsComFollowupAtrasado.add(id))
      return leadsComFollowupAtrasado.size
    })(),
    // Contratos: total
    countTable('client_contracts'),
    // Contratos pendentes: não assinados
    (async () => {
      const { count } = await (supabase as any).from('client_contracts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('signed', false)
      return count ?? 0
    })(),
    // Financeiro: total clientes distintos com parcelas
    (async () => {
      const { data } = await (supabase as any).from('client_installments').select('client_id').eq('organization_id', orgId)
      return new Set((data ?? []).map((r: any) => r.client_id)).size
    })(),
    // Financeiro pendentes: clientes com parcelas vencidas não pagas
    (async () => {
      const { data } = await (supabase as any).from('client_installments').select('client_id').eq('organization_id', orgId).eq('status', 'pendente').lt('due_date', today)
      return new Set((data ?? []).map((r: any) => r.client_id)).size
    })(),
    // Projetos
    countTable('client_projects'),
    countByStatus('client_projects', 'status', ['pendente', 'enviado']),
    // Compras
    countTable('client_purchases'),
    // Compras pendentes: sem status ou aguardando
    (async () => {
      const { count: aguardando } = await (supabase as any).from('client_purchases').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'aguardando')
      const { count: semStatus } = await (supabase as any).from('client_purchases').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('status', null)
      return (aguardando ?? 0) + (semStatus ?? 0)
    })(),
    // Comissões
    countTable('client_commissions'),
    countByStatus('client_commissions', 'status', ['pendente']),
    // Entrega Material
    countTable('client_deliveries'),
    countByStatus('client_deliveries', 'status', ['pendente']),
    // Obra
    countTable('client_obras'),
    countByStatus('client_obras', 'status', ['aguardando', 'em_andamento']),
    // Entrega da Obra
    countTable('client_obra_deliveries'),
    countByStatus('client_obra_deliveries', 'status', ['pendente']),
    // Pós-Obra
    countTable('client_pos_obra'),
    countByStatus('client_pos_obra', 'status', ['pendente']),
  ])

  return [
    { label: 'Leads',             href: '/leads',             total: leadsTotal,       pending: leadsPending,       color: '#FFD080' },
    { label: 'Contratos',         href: '/contratos',         total: contratosTotal,   pending: contratosPending,   color: '#E8B84D' },
    { label: 'Financeiro',        href: '/financeiro',        total: finClients,       pending: finPending,         color: '#D4A03A' },
    { label: 'Projetos',          href: '/projetos',          total: projTotal,        pending: projPending,        color: '#C08A28' },
    { label: 'Compras',           href: '/compras',           total: compTotal,        pending: compPending,        color: '#FFD080' },
    { label: 'Comissões',         href: '/comissoes',         total: comTotal,         pending: comPending,         color: '#E8B84D' },
    { label: 'Entrega Material',  href: '/entrega-material',  total: entregaTotal,     pending: entregaPending,     color: '#D4A03A' },
    { label: 'Obra',              href: '/obra',              total: obraTotal,        pending: obraPending,        color: '#C08A28' },
    { label: 'Entrega da Obra',   href: '/entrega-obra',      total: entregaObraTotal, pending: entregaObraPending, color: '#FFD080' },
    { label: 'Pós-Obra',          href: '/pos-obra',          total: posObraTotal,     pending: posObraPending,     color: '#E8B84D' },
  ]
}

// ── KPIs ─────────────────────────────────────────────────────────

export async function getKpiData(dateFrom: string | null, dateTo: string | null): Promise<KpiData> {
  const orgId = await getOrgId()
  if (!orgId) return { qtd_vendas: 0, valor_total: 0, potencia_kwp: 0, ticket_medio: 0 }

  const supabase = await createClient()

  let q = (supabase as any).from('clients').select('id, system_power_kwp').eq('organization_id', orgId).not('contract_date', 'is', null)
  if (dateFrom) q = q.gte('contract_date', dateFrom)
  if (dateTo) q = q.lte('contract_date', dateTo)
  const { data: clientsData } = await q

  const clients = (clientsData ?? []) as { id: string; system_power_kwp: number | null }[]
  const ids = clients.map((c) => c.id)
  const qtd_vendas = clients.length
  const potencia_kwp = clients.reduce((s, c) => s + (c.system_power_kwp ?? 0), 0)

  let valor_total = 0
  if (ids.length > 0) {
    const { data: sales } = await (supabase as any).from('client_sale').select('sale_value').in('client_id', ids)
    valor_total = ((sales ?? []) as any[]).reduce((s, x) => s + (x.sale_value ?? 0), 0)
  }

  return { qtd_vendas, valor_total, potencia_kwp, ticket_medio: qtd_vendas > 0 ? valor_total / qtd_vendas : 0 }
}

// ── Faturamento Comparativo ──────────────────────────────────────

export async function getFaturamentoComparativo(): Promise<FaturamentoMes[]> {
  const orgId = await getOrgId()
  if (!orgId) return []

  const supabase = await createClient()
  const now = new Date()
  const anoAtual = now.getFullYear()
  const anoAnterior = anoAtual - 1

  const { data: raw } = await (supabase as any)
    .from('clients')
    .select('contract_date, client_sale(sale_value)')
    .eq('organization_id', orgId)
    .not('contract_date', 'is', null)
    .gte('contract_date', `${anoAnterior}-01-01`)
    .lte('contract_date', `${anoAtual}-12-31`)

  const mapAtual: Record<number, number> = {}
  const mapAnterior: Record<number, number> = {}

  for (const c of (raw ?? []) as any[]) {
    const d = new Date(c.contract_date)
    const year = d.getFullYear()
    const month = d.getMonth()
    const valor = Array.isArray(c.client_sale)
      ? c.client_sale.reduce((s: number, x: any) => s + (x.sale_value ?? 0), 0)
      : (c.client_sale?.sale_value ?? 0)

    if (year === anoAtual) mapAtual[month] = (mapAtual[month] ?? 0) + valor
    else if (year === anoAnterior) mapAnterior[month] = (mapAnterior[month] ?? 0) + valor
  }

  return Array.from({ length: 12 }, (_, i) => ({
    mes: `${anoAtual}-${String(i + 1).padStart(2, '0')}`,
    label: MES_LABELS[i],
    ano_atual: mapAtual[i] ?? 0,
    ano_anterior: mapAnterior[i] ?? 0,
  }))
}

// ── Leads por Origem ─────────────────────────────────────────────

export async function getLeadsPorOrigem(): Promise<LeadOrigemItem[]> {
  const orgId = await getOrgId()
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('leads')
    .select('lead_source_id, lead_sources!lead_source_id(name)')
    .eq('organization_id', orgId)
    .eq('converted', false)

  const map: Record<string, { name: string; count: number }> = {}
  for (const row of (data ?? []) as any[]) {
    const name = row.lead_sources?.name ?? 'Sem origem'
    if (!map[name]) map[name] = { name, count: 0 }
    map[name].count++
  }

  return Object.values(map).sort((a, b) => b.count - a.count)
}

// ── Meta ─────────────────────────────────────────────────────────

export async function getMetaData(dateFrom: string | null, dateTo: string | null): Promise<MetaData> {
  const orgId = await getOrgId()
  if (!orgId) return { meta_anual: 0, meta_mensal: 0, realizado_mes: 0, realizado_ano: 0 }

  const supabase = await createClient()

  const { data: config } = await (supabase as any).from('org_config').select('meta_anual').eq('organization_id', orgId).maybeSingle()
  const meta_anual = config?.meta_anual ?? 0
  const meta_mensal = meta_anual > 0 ? meta_anual / 12 : 0

  const now = new Date()
  const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const hoje = now.toISOString().split('T')[0]
  const anoInicio = `${now.getFullYear()}-01-01`
  const anoFim = `${now.getFullYear()}-12-31`

  const fromMes = dateFrom ?? mesInicio
  const toMes = dateTo ?? hoje

  const [clientesMes, clientesAno] = await Promise.all([
    (supabase as any).from('clients').select('id').eq('organization_id', orgId).gte('contract_date', fromMes).lte('contract_date', toMes),
    (supabase as any).from('clients').select('id').eq('organization_id', orgId).gte('contract_date', anoInicio).lte('contract_date', anoFim),
  ])

  const idsMes = ((clientesMes.data ?? []) as any[]).map((c) => c.id)
  const idsAno = ((clientesAno.data ?? []) as any[]).map((c) => c.id)

  const [salesMes, salesAno] = await Promise.all([
    idsMes.length > 0 ? (supabase as any).from('client_sale').select('sale_value').in('client_id', idsMes) : { data: [] },
    idsAno.length > 0 ? (supabase as any).from('client_sale').select('sale_value').in('client_id', idsAno) : { data: [] },
  ])

  const realizado_mes = ((salesMes.data ?? []) as any[]).reduce((s, x) => s + (x.sale_value ?? 0), 0)
  const realizado_ano = ((salesAno.data ?? []) as any[]).reduce((s, x) => s + (x.sale_value ?? 0), 0)

  return { meta_anual, meta_mensal, realizado_mes, realizado_ano }
}

// web/lib/relatorios/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type RelatorioFilter = {
  dateFrom: string | null
  dateTo: string | null
}

export type VendasPorPeriodoRow = {
  mes: string
  label: string
  qtd_contratos: number
  valor_total: number
  ticket_medio: number
}

export type ComercialSummary = {
  qtd_propostas: number
  qtd_contratos: number
  valor_total: number
  ticket_medio: number
  taxa_conversao: number
  margem_media: number
  pf: number
  pj: number
  vendas_por_periodo: VendasPorPeriodoRow[]
}

export type LeadOrigemRow = {
  origem: string
  total_leads: number
  leads_convertidos: number
  taxa_conversao: number
}

export type RankingVendedorRow = {
  nome: string
  qtd_leads: number
  qtd_contratos: number
  valor_vendido: number
}

export type ComissaoVendedorRow = {
  nome: string
  qtd_contratos: number
  valor_total: number
  comissao: number
}

export type FinanceiroSummary = {
  comissoes: ComissaoVendedorRow[]
  ticket_medio_mes: number
  ticket_medio_anual: number
  valor_mes_atual: number
  valor_mes_anterior: number
  variacao_mensal: number | null
  media_3m: number
  media_12m: number
  crescimento_mensal: number | null
  crescimento_trimestral: number | null
  crescimento_anual: number | null
  evolucao_ticket: VendasPorPeriodoRow[]
  comparativo_anual: { ano: number; valor: number; contratos: number }[]
}

export type TecnicoSummary = {
  tempo_medio_implantacao: number | null
  modulos_por_fabricante: { fabricante: string; quantidade: number }[]
  inversores_por_fabricante: { fabricante: string; quantidade: number }[]
  total_kwh_projetados: number
}

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function mesLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${MES_LABELS[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`
}

async function getOrgId() {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

// ── Comercial ───────────────────────────────────────────────────

export async function getComercialData(filter: RelatorioFilter): Promise<ComercialSummary> {
  const orgId = await getOrgId()
  if (!orgId) return { qtd_propostas: 0, qtd_contratos: 0, valor_total: 0, ticket_medio: 0, taxa_conversao: 0, margem_media: 0, pf: 0, pj: 0, vendas_por_periodo: [] }

  const supabase = await createClient()

  let propQuery = (supabase as any).from('clients').select('id', { count: 'exact' }).eq('organization_id', orgId)
  if (filter.dateFrom) propQuery = propQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) propQuery = propQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { count: qtd_propostas } = await propQuery

  let contQuery = (supabase as any)
    .from('clients')
    .select('id, type, contract_date, client_sale(sale_value)')
    .eq('organization_id', orgId)
    .not('contract_date', 'is', null)
  if (filter.dateFrom) contQuery = contQuery.gte('contract_date', filter.dateFrom)
  if (filter.dateTo) contQuery = contQuery.lte('contract_date', filter.dateTo)
  const { data: contratos } = await contQuery
  const arr = (contratos ?? []) as any[]

  const { data: orgConfig } = await (supabase as any).from('org_config').select('pct_margem').eq('organization_id', orgId).maybeSingle()
  const margem_config = orgConfig?.pct_margem ?? 0

  let valor_total = 0, pf = 0, pj = 0
  const mesBucket: Record<string, { label: string; qtd: number; valor: number }> = {}

  for (const c of arr) {
    const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
    const valor = sale?.sale_value ?? 0
    valor_total += valor
    if (c.type === 'pf') pf++
    else if (c.type === 'pj') pj++
    if (c.contract_date) {
      const key = c.contract_date.substring(0, 7)
      if (!mesBucket[key]) mesBucket[key] = { label: mesLabel(c.contract_date), qtd: 0, valor: 0 }
      mesBucket[key].qtd++
      mesBucket[key].valor += valor
    }
  }

  const qtd_contratos = arr.length
  const ticket_medio = qtd_contratos > 0 ? valor_total / qtd_contratos : 0
  const taxa_conversao = (qtd_propostas ?? 0) > 0 ? (qtd_contratos / (qtd_propostas ?? 1)) * 100 : 0

  const vendas_por_periodo = Object.entries(mesBucket)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, label: v.label, qtd_contratos: v.qtd, valor_total: v.valor, ticket_medio: v.qtd > 0 ? v.valor / v.qtd : 0 }))

  return { qtd_propostas: qtd_propostas ?? 0, qtd_contratos, valor_total, ticket_medio, taxa_conversao, margem_media: margem_config, pf, pj, vendas_por_periodo }
}

// ── Leads ────────────────────────────────────────────────────────

export async function getLeadsData(filter: RelatorioFilter): Promise<{ origens: LeadOrigemRow[]; ranking: RankingVendedorRow[] }> {
  const orgId = await getOrgId()
  if (!orgId) return { origens: [], ranking: [] }

  const supabase = await createClient()

  let leadsQuery = (supabase as any).from('leads').select('id, converted, lead_source_id, lead_sources!lead_source_id(name)').eq('organization_id', orgId)
  if (filter.dateFrom) leadsQuery = leadsQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) leadsQuery = leadsQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { data: leadsData } = await leadsQuery

  const origemMap: Record<string, { total: number; convertidos: number }> = {}
  for (const l of (leadsData ?? []) as any[]) {
    const nome = l.lead_sources?.name ?? 'Sem origem'
    if (!origemMap[nome]) origemMap[nome] = { total: 0, convertidos: 0 }
    origemMap[nome].total++
    if (l.converted) origemMap[nome].convertidos++
  }
  const origens = Object.entries(origemMap).sort(([, a], [, b]) => b.total - a.total)
    .map(([origem, v]) => ({ origem, total_leads: v.total, leads_convertidos: v.convertidos, taxa_conversao: v.total > 0 ? (v.convertidos / v.total) * 100 : 0 }))

  let rankQuery = (supabase as any).from('clients')
    .select('id, contract_date, responsible_id, profiles!responsible_id(full_name, email), client_sale(sale_value)')
    .eq('organization_id', orgId)
  if (filter.dateFrom) rankQuery = rankQuery.gte('created_at', filter.dateFrom)
  if (filter.dateTo) rankQuery = rankQuery.lte('created_at', filter.dateTo + 'T23:59:59')
  const { data: clientsData } = await rankQuery

  const vendedorMap: Record<string, { nome: string; qtd_leads: number; qtd_contratos: number; valor: number }> = {}
  for (const c of (clientsData ?? []) as any[]) {
    const profile = c.profiles
    if (!profile) continue
    const nome = profile.full_name ?? profile.email ?? 'Desconhecido'
    const id = c.responsible_id ?? nome
    if (!vendedorMap[id]) vendedorMap[id] = { nome, qtd_leads: 0, qtd_contratos: 0, valor: 0 }
    vendedorMap[id].qtd_leads++
    if (c.contract_date) {
      vendedorMap[id].qtd_contratos++
      const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
      vendedorMap[id].valor += sale?.sale_value ?? 0
    }
  }
  const ranking = Object.values(vendedorMap).sort((a, b) => b.valor - a.valor)
    .map((v) => ({ nome: v.nome, qtd_leads: v.qtd_leads, qtd_contratos: v.qtd_contratos, valor_vendido: v.valor }))

  return { origens, ranking }
}

// ── Financeiro ───────────────────────────────────────────────────

export async function getFinanceiroData(filter: RelatorioFilter): Promise<FinanceiroSummary> {
  const orgId = await getOrgId()
  const empty: FinanceiroSummary = { comissoes: [], ticket_medio_mes: 0, ticket_medio_anual: 0, valor_mes_atual: 0, valor_mes_anterior: 0, variacao_mensal: null, media_3m: 0, media_12m: 0, crescimento_mensal: null, crescimento_trimestral: null, crescimento_anual: null, evolucao_ticket: [], comparativo_anual: [] }
  if (!orgId) return empty

  const supabase = await createClient()

  const { data: allContracts } = await (supabase as any)
    .from('clients')
    .select('id, contract_date, created_at, responsible_id, profiles!responsible_id(full_name, email), client_sale(sale_value, commission_pct)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  const todos = ((allContracts ?? []) as any[]).filter((c: any) => {
    const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
    return sale?.sale_value != null && sale.sale_value > 0
  })

  const filtrados = todos.filter((c: any) => {
    const date = c.contract_date ?? c.created_at?.split('T')[0]
    if (!date) return false
    if (filter.dateFrom && date < filter.dateFrom) return false
    if (filter.dateTo && date > filter.dateTo) return false
    return true
  })

  const comMap: Record<string, { nome: string; qtd: number; valor: number; comissao: number }> = {}
  for (const c of filtrados) {
    const profile = c.profiles
    if (!profile) continue
    const nome = profile.full_name ?? profile.email ?? 'Desconhecido'
    const id = c.responsible_id ?? nome
    if (!comMap[id]) comMap[id] = { nome, qtd: 0, valor: 0, comissao: 0 }
    comMap[id].qtd++
    const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
    const valor = sale?.sale_value ?? 0
    const pct = Number(sale?.commission_pct ?? 0)
    comMap[id].valor += valor
    comMap[id].comissao += valor * pct / 100
  }
  const comissoes = Object.values(comMap).sort((a, b) => b.comissao - a.comissao)
    .map((v) => ({ nome: v.nome, qtd_contratos: v.qtd, valor_total: v.valor, comissao: v.comissao }))

  const mesBucket: Record<string, { qtd: number; valor: number }> = {}
  for (const c of todos) {
    const sale = Array.isArray(c.client_sale) ? c.client_sale[0] : c.client_sale
    const valor = sale?.sale_value ?? 0
    const dateStr = c.contract_date ?? c.created_at?.split('T')[0] ?? null
    if (!dateStr) continue
    const key = dateStr.substring(0, 7)
    if (!mesBucket[key]) mesBucket[key] = { qtd: 0, valor: 0 }
    mesBucket[key].qtd++
    mesBucket[key].valor += valor
  }

  const mesesOrdenados = Object.entries(mesBucket).sort(([a], [b]) => a.localeCompare(b))

  const evolucao_ticket = mesesOrdenados.map(([mes, v]) => ({
    mes, label: mesLabel(mes + '-01'), qtd_contratos: v.qtd, valor_total: v.valor, ticket_medio: v.qtd > 0 ? v.valor / v.qtd : 0,
  }))

  const now = new Date()
  const mesAtualKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const mesAnteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const mesAnteriorKey = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`

  const mesAtual = mesBucket[mesAtualKey] ?? { qtd: 0, valor: 0 }
  const mesAnterior = mesBucket[mesAnteriorKey] ?? { qtd: 0, valor: 0 }

  const ticket_medio_mes = mesAtual.qtd > 0 ? mesAtual.valor / mesAtual.qtd : 0

  const anoAtual = now.getFullYear()
  let valorAno = 0, qtdAno = 0
  for (const [mes, v] of mesesOrdenados) {
    if (mes.startsWith(String(anoAtual))) { valorAno += v.valor; qtdAno += v.qtd }
  }
  const ticket_medio_anual = qtdAno > 0 ? valorAno / qtdAno : 0

  const variacao_mensal = mesAnterior.valor > 0 ? ((mesAtual.valor - mesAnterior.valor) / mesAnterior.valor) * 100 : null

  const ultimos = mesesOrdenados.slice(-12)
  const ultimos3 = mesesOrdenados.slice(-3)
  const media_3m = ultimos3.length > 0 ? ultimos3.reduce((s, [, v]) => s + v.valor, 0) / ultimos3.length : 0
  const media_12m = ultimos.length > 0 ? ultimos.reduce((s, [, v]) => s + v.valor, 0) / ultimos.length : 0

  const crescimento_mensal = variacao_mensal
  const trimAtual = mesesOrdenados.slice(-3).reduce((s, [, v]) => s + v.valor, 0)
  const trimAnterior = mesesOrdenados.slice(-6, -3).reduce((s, [, v]) => s + v.valor, 0)
  const crescimento_trimestral = trimAnterior > 0 ? ((trimAtual - trimAnterior) / trimAnterior) * 100 : null

  const anoAnterior = anoAtual - 1
  let valorAnoAnt = 0
  for (const [mes, v] of mesesOrdenados) {
    if (mes.startsWith(String(anoAnterior))) valorAnoAnt += v.valor
  }
  const crescimento_anual = valorAnoAnt > 0 ? ((valorAno - valorAnoAnt) / valorAnoAnt) * 100 : null

  const mesNum = now.getMonth() + 1
  const comparativo_anual: { ano: number; valor: number; contratos: number }[] = []
  for (let y = anoAtual - 3; y <= anoAtual; y++) {
    const key = `${y}-${String(mesNum).padStart(2, '0')}`
    const d = mesBucket[key]
    if (d) comparativo_anual.push({ ano: y, valor: d.valor, contratos: d.qtd })
  }

  return {
    comissoes, ticket_medio_mes, ticket_medio_anual, valor_mes_atual: mesAtual.valor, valor_mes_anterior: mesAnterior.valor,
    variacao_mensal, media_3m, media_12m, crescimento_mensal, crescimento_trimestral, crescimento_anual, evolucao_ticket, comparativo_anual,
  }
}

// ── Técnico ──────────────────────────────────────────────────────

export async function getTecnicoData(filter: RelatorioFilter): Promise<TecnicoSummary> {
  const orgId = await getOrgId()
  if (!orgId) return { tempo_medio_implantacao: null, modulos_por_fabricante: [], inversores_por_fabricante: [], total_kwh_projetados: 0 }

  const supabase = await createClient()

  let clientQuery = (supabase as any)
    .from('clients')
    .select('id, panel_brand, inverter_brand, promised_kwh')
    .eq('organization_id', orgId)
    .not('contract_date', 'is', null)
  if (filter.dateFrom) clientQuery = clientQuery.gte('contract_date', filter.dateFrom)
  if (filter.dateTo) clientQuery = clientQuery.lte('contract_date', filter.dateTo)
  const { data: clientes } = await clientQuery

  const modulosMap: Record<string, number> = {}
  const inversoresMap: Record<string, number> = {}
  let total_kwh = 0

  for (const c of (clientes ?? []) as any[]) {
    const mb = (c.panel_brand ?? '').trim()
    if (mb) modulosMap[mb] = (modulosMap[mb] ?? 0) + 1
    const ib = (c.inverter_brand ?? '').trim()
    if (ib) inversoresMap[ib] = (inversoresMap[ib] ?? 0) + 1
    total_kwh += Number(c.promised_kwh ?? 0)
  }

  let obrasQuery = (supabase as any)
    .from('client_obras')
    .select('client_id, data_inicio, clients!client_id(delivery_start_date)')
    .eq('organization_id', orgId)
    .not('data_inicio', 'is', null)
  if (filter.dateFrom) obrasQuery = obrasQuery.gte('data_inicio', filter.dateFrom)
  if (filter.dateTo) obrasQuery = obrasQuery.lte('data_inicio', filter.dateTo)
  const { data: obras } = await obrasQuery

  let dias_total = 0, dias_count = 0
  for (const o of (obras ?? []) as any[]) {
    const startDate = o.clients?.delivery_start_date
    if (startDate && o.data_inicio) {
      const dias = Math.floor((new Date(o.data_inicio).getTime() - new Date(startDate).getTime()) / 86400000)
      if (dias >= 0) { dias_total += dias; dias_count++ }
    }
  }

  return {
    tempo_medio_implantacao: dias_count > 0 ? Math.round(dias_total / dias_count) : null,
    modulos_por_fabricante: Object.entries(modulosMap).sort(([, a], [, b]) => b - a).map(([fabricante, quantidade]) => ({ fabricante, quantidade })),
    inversores_por_fabricante: Object.entries(inversoresMap).sort(([, a], [, b]) => b - a).map(([fabricante, quantidade]) => ({ fabricante, quantidade })),
    total_kwh_projetados: total_kwh,
  }
}

// ── Pós-Venda ────────────────────────────────────────────────────

export type ExpansaoClienteRow = {
  nome: string
  cidade: string | null
  telefone: string | null
  potencia_kwp: number | null
  inversor_marca: string | null
  capacidade_extra: string | null
  contract_date: string | null
}

export type PosVendaSummary = {
  clientes_expansao: ExpansaoClienteRow[]
  nps_medio: number | null
  total_pos_obra: number
  concluidos: number
}

export async function getPosVendaData(filter: RelatorioFilter): Promise<PosVendaSummary> {
  const orgId = await getOrgId()
  if (!orgId) return { clientes_expansao: [], nps_medio: null, total_pos_obra: 0, concluidos: 0 }

  const supabase = await createClient()

  // Clientes com capacidade extra
  let expQuery = (supabase as any)
    .from('clients')
    .select('name, city, phone, system_power_kwp, inverter_brand, inverter_extra_capacity, contract_date')
    .eq('organization_id', orgId)
    .not('inverter_extra_capacity', 'is', null)
    .neq('inverter_extra_capacity', '')
  if (filter.dateFrom) expQuery = expQuery.gte('contract_date', filter.dateFrom)
  if (filter.dateTo) expQuery = expQuery.lte('contract_date', filter.dateTo)
  const { data: expData } = await expQuery

  const clientes_expansao = ((expData ?? []) as any[]).map((c) => ({
    nome: c.name,
    cidade: c.city,
    telefone: c.phone,
    potencia_kwp: c.system_power_kwp,
    inversor_marca: c.inverter_brand,
    capacidade_extra: c.inverter_extra_capacity,
    contract_date: c.contract_date,
  }))

  // NPS médio
  const { data: posData } = await (supabase as any)
    .from('client_pos_obra')
    .select('nps, status')
    .eq('organization_id', orgId)
    .not('nps', 'is', null)

  const posArr = (posData ?? []) as any[]
  const npsValues = posArr.filter((p) => p.nps != null).map((p) => Number(p.nps))
  const nps_medio = npsValues.length > 0 ? npsValues.reduce((s, v) => s + v, 0) / npsValues.length : null
  const total_pos_obra = posArr.length
  const concluidos = posArr.filter((p) => p.status === 'concluida').length

  return { clientes_expansao, nps_medio, total_pos_obra, concluidos }
}

// ── SLA / Tempos de Execução ─────────────────────────────────────

export type SlaEtapa = {
  etapa: string
  tempo_medio_dias: number | null
  total_registros: number
}

export type SlaSummary = {
  etapas: SlaEtapa[]
  prazo_medio_total: number | null
}

export async function getSlaData(): Promise<SlaSummary> {
  const orgId = await getOrgId()
  if (!orgId) return { etapas: [], prazo_medio_total: null }

  const supabase = await createClient()

  // Buscar clientes com delivery_start_date e pipeline_flags
  const { data: clients } = await (supabase as any)
    .from('clients')
    .select('id, delivery_start_date, contract_max_days, pipeline_flags')
    .eq('organization_id', orgId)
    .not('delivery_start_date', 'is', null)

  const arr = (clients ?? []) as any[]
  const now = Date.now()

  let totalDias = 0, totalCount = 0
  for (const c of arr) {
    const start = new Date(c.delivery_start_date).getTime()
    const dias = Math.floor((now - start) / 86400000)
    totalDias += dias
    totalCount++
  }

  const prazo_medio_total = totalCount > 0 ? Math.round(totalDias / totalCount) : null

  // Tempos médios por etapa (usando tabelas de pipeline)
  const tables = [
    { table: 'client_projects', etapa: 'Projetos', dateField: 'created_at' },
    { table: 'client_purchases', etapa: 'Compras', dateField: 'created_at' },
    { table: 'client_deliveries', etapa: 'Entrega Material', dateField: 'created_at' },
    { table: 'client_obras', etapa: 'Obra', dateField: 'data_inicio' },
    { table: 'client_obra_deliveries', etapa: 'Entrega da Obra', dateField: 'created_at' },
    { table: 'client_pos_obra', etapa: 'Pós-Obra', dateField: 'created_at' },
  ]

  const etapas: SlaEtapa[] = []

  for (const t of tables) {
    const { data } = await (supabase as any)
      .from(t.table)
      .select(`client_id, ${t.dateField}, updated_at, status`)
      .eq('organization_id', orgId)

    const records = (data ?? []) as any[]
    let somaDias = 0, count = 0

    for (const r of records) {
      const start = r[t.dateField] ? new Date(r[t.dateField]).getTime() : null
      const end = r.updated_at ? new Date(r.updated_at).getTime() : now
      if (start) {
        const dias = Math.floor((end - start) / 86400000)
        if (dias >= 0) { somaDias += dias; count++ }
      }
    }

    etapas.push({
      etapa: t.etapa,
      tempo_medio_dias: count > 0 ? Math.round(somaDias / count) : null,
      total_registros: records.length,
    })
  }

  return { etapas, prazo_medio_total }
}

'use client'

import { useState, useTransition } from 'react'
import { DatePicker } from '@/components/ui/inputs'
import './print.css'
import {
  getComercialData, getLeadsData, getFinanceiroData, getTecnicoData, getPosVendaData, getSlaData,
} from '@/lib/relatorios/actions'
import type {
  ComercialSummary, LeadOrigemRow, RankingVendedorRow,
  FinanceiroSummary, TecnicoSummary, PosVendaSummary, SlaSummary, RelatorioFilter,
} from '@/lib/relatorios/queries'
import { formatPhone } from '@/lib/format'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

type Tab = 'comercial' | 'leads' | 'financeiro' | 'tecnico' | 'posvenda' | 'sla'

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtNum(v: number, decimals = 0) { return v.toLocaleString('pt-BR', { maximumFractionDigits: decimals }) }
function fmtPct(v: number) { return v.toFixed(1) + '%' }

function FilterBar({ dateFrom, dateTo, onChange, onApply, isPending }: {
  dateFrom: string; dateTo: string; onChange: (f: string, t: string) => void; onApply: () => void; isPending: boolean
}) {
  return (
    <div className="no-print flex flex-wrap items-end gap-3 mb-6">
      <div className="min-w-[140px]"><DatePicker label="De" value={dateFrom} onChange={(iso) => onChange(iso, dateTo)} /></div>
      <div className="min-w-[140px]"><DatePicker label="Até" value={dateTo} onChange={(iso) => onChange(dateFrom, iso)} /></div>
      <button onClick={onApply} disabled={isPending} className="mt-5 px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 text-white/70 hover:text-white transition-colors disabled:opacity-50">
        {isPending ? 'Buscando...' : 'Aplicar'}
      </button>
    </div>
  )
}

function EmptyState() { return <p className="text-white/30 py-12 text-center">Aplique um filtro para ver os dados.</p> }

function TableWrapper({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl overflow-hidden border border-white/[0.08] overflow-x-auto"><table className="w-full text-sm min-w-[400px]">{children}</table></div>
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40" style={{ background: 'var(--theme-input-bg)' }}>{children}</th>
}
function Td({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return <td className="px-4 py-2.5 font-medium" style={{ borderBottom: '1px solid var(--theme-border)', color: highlight ? 'var(--theme-accent)' : 'var(--theme-text)' }}>{children}</td>
}

function KpiCard({ label, value, sub, help }: { label: string; value: string; sub?: string; help?: string }) {
  return (
    <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
      <p className="text-xs text-white/40 mb-1">
        {label}
        {help && <HelpTooltip content={help} />}
      </p>
      <p className="text-lg font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: sub.startsWith('-') ? '#EF4444' : '#10B981' }}>{sub}</p>}
    </div>
  )
}

function VariacaoTag({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-white/25">—</span>
  const color = value >= 0 ? '#10B981' : '#EF4444'
  const arrow = value >= 0 ? '↑' : '↓'
  return <span className="text-xs font-semibold" style={{ color }}>{arrow} {Math.abs(value).toFixed(1)}%</span>
}

// ── Aba Comercial ──────────────────────────────────────────────
function AbaComercial({ data }: { data: ComercialSummary | null }) {
  if (!data) return <EmptyState />
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório Comercial</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Clientes Cadastrados" value={fmtNum(data.qtd_propostas)} help="Total de clientes cadastrados no período (propostas geradas)." />
        <KpiCard label="Contratos Fechados" value={fmtNum(data.qtd_contratos)} help="Número de contratos efetivamente assinados no período." />
        <KpiCard label="Valor Vendido" value={fmt(data.valor_total)} help="Soma total dos valores dos contratos fechados no período." />
        <KpiCard label="Ticket Médio" value={fmt(data.ticket_medio)} help="Valor médio de cada contrato. Calculado como valor total ÷ número de contratos." />
        <KpiCard label="Taxa de Conversão" value={fmtPct(data.taxa_conversao)} help="Percentual de clientes cadastrados que viraram contratos fechados." />
        <KpiCard label="Margem Configurada" value={fmtPct(data.margem_media)} help="Margem de lucro média por projeto (configurada nas propostas)." />
        <KpiCard label="Pessoa Física" value={fmtNum(data.pf)} help="Quantidade de contratos com clientes pessoa física (CPF)." />
        <KpiCard label="Pessoa Jurídica" value={fmtNum(data.pj)} help="Quantidade de contratos com clientes pessoa jurídica (CNPJ)." />
      </div>
      <h3 className="text-sm font-semibold text-white/70 mb-2">Vendas por Período</h3>
      <TableWrapper>
        <thead><tr><Th>Mês</Th><Th>Contratos</Th><Th>Valor Total</Th><Th>Ticket Médio</Th></tr></thead>
        <tbody>
          {data.vendas_por_periodo.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {data.vendas_por_periodo.map((r) => (
            <tr key={r.mes}><Td>{r.label}</Td><Td>{r.qtd_contratos}</Td><Td>{fmt(r.valor_total)}</Td><Td highlight>{fmt(r.ticket_medio)}</Td></tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  )
}

// ── Aba Leads ──────────────────────────────────────────────────
function AbaLeads({ origens, ranking }: { origens: LeadOrigemRow[] | null; ranking: RankingVendedorRow[] | null }) {
  if (!origens) return <EmptyState />
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório de Leads</h2>
      <h3 className="text-sm font-semibold text-white/70 mb-2">Leads por Origem</h3>
      <TableWrapper>
        <thead><tr><Th>Origem<HelpTooltip content="Canal por onde o lead chegou (indicação, tráfego pago, site, etc.)." /></Th><Th>Total<HelpTooltip content="Total de leads captados por essa origem no período." /></Th><Th>Convertidos<HelpTooltip content="Quantidade de leads dessa origem que viraram contratos." /></Th><Th>Taxa de Conversão<HelpTooltip content="Percentual de leads dessa origem que viraram contratos (convertidos ÷ total)." /></Th></tr></thead>
        <tbody>
          {origens.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {origens.map((r) => (<tr key={r.origem}><Td>{r.origem}</Td><Td>{r.total_leads}</Td><Td>{r.leads_convertidos}</Td><Td highlight>{fmtPct(r.taxa_conversao)}</Td></tr>))}
        </tbody>
      </TableWrapper>
      <h3 className="text-sm font-semibold text-white/70 mt-6 mb-2">Ranking de Vendedores</h3>
      <TableWrapper>
        <thead><tr><Th>#</Th><Th>Vendedor</Th><Th>Clientes</Th><Th>Contratos</Th><Th>Valor Vendido</Th></tr></thead>
        <tbody>
          {(ranking ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {(ranking ?? []).map((r, i) => (<tr key={r.nome}><Td><span className="text-white/30">{i + 1}</span></Td><Td>{r.nome}</Td><Td>{r.qtd_leads}</Td><Td>{r.qtd_contratos}</Td><Td highlight>{fmt(r.valor_vendido)}</Td></tr>))}
        </tbody>
      </TableWrapper>
    </div>
  )
}

// ── Aba Financeiro ─────────────────────────────────────────────
function AbaFinanceiro({ data }: { data: FinanceiroSummary | null }) {
  if (!data) return <EmptyState />
  return (
    <div id="print-area" className="space-y-6">
      <h2 className="text-white font-bold text-lg">Relatório Financeiro</h2>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ticket Médio (mês atual)" value={fmt(data.ticket_medio_mes)} help="Valor médio dos contratos fechados neste mês." />
        <KpiCard label="Ticket Médio (anual)" value={fmt(data.ticket_medio_anual)} help="Valor médio dos contratos fechados no ano." />
        <KpiCard label="Faturamento Mês Atual" value={fmt(data.valor_mes_atual)} sub={data.variacao_mensal !== null ? `${data.variacao_mensal >= 0 ? '+' : ''}${data.variacao_mensal.toFixed(1)}% vs mês anterior` : undefined} help="Receita bruta acumulada no mês corrente." />
        <KpiCard label="Faturamento Mês Anterior" value={fmt(data.valor_mes_anterior)} help="Receita bruta do mês anterior. Serve de base para o comparativo." />
      </div>

      {/* Comparativos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
          <p className="text-xs text-white/40 mb-1">Média últimos 3 meses<HelpTooltip content="Faturamento médio dos últimos 3 meses. Suaviza sazonalidade para análise de tendência." /></p>
          <p className="text-base font-bold text-white">{fmt(data.media_3m)}</p>
        </div>
        <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
          <p className="text-xs text-white/40 mb-1">Média últimos 12 meses<HelpTooltip content="Faturamento médio dos últimos 12 meses (média móvel anual)." /></p>
          <p className="text-base font-bold text-white">{fmt(data.media_12m)}</p>
        </div>
        <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
          <p className="text-xs text-white/40 mb-1">Variação vs mês anterior<HelpTooltip content="Percentual de crescimento (ou queda) do faturamento em relação ao mês anterior." /></p>
          <p className="text-base font-bold"><VariacaoTag value={data.variacao_mensal} /></p>
        </div>
      </div>

      {/* Crescimento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
          <p className="text-xs text-white/40 mb-1">Crescimento Mensal<HelpTooltip content="Taxa de crescimento do faturamento mês contra mês." /></p>
          <VariacaoTag value={data.crescimento_mensal} />
        </div>
        <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
          <p className="text-xs text-white/40 mb-1">Crescimento Trimestral<HelpTooltip content="Taxa de crescimento do faturamento comparando os últimos 3 meses com o trimestre anterior." /></p>
          <VariacaoTag value={data.crescimento_trimestral} />
        </div>
        <div className="rounded-xl p-4 border border-white/10" style={{ background: 'var(--theme-surface)' }}>
          <p className="text-xs text-white/40 mb-1">Crescimento Anual<HelpTooltip content="Taxa de crescimento do faturamento comparando o ano atual com o ano anterior." /></p>
          <VariacaoTag value={data.crescimento_anual} />
        </div>
      </div>

      {/* Comparativo Anual */}
      {data.comparativo_anual.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-white/70">Comparativo Anual (mesmo mês)</h3>
          <TableWrapper>
            <thead><tr><Th>Ano</Th><Th>Contratos</Th><Th>Faturamento</Th></tr></thead>
            <tbody>
              {data.comparativo_anual.map((r) => (
                <tr key={r.ano}><Td>{r.ano}</Td><Td>{r.contratos}</Td><Td highlight>{fmt(r.valor)}</Td></tr>
              ))}
            </tbody>
          </TableWrapper>
        </>
      )}

      {/* Evolução Ticket Médio */}
      <h3 className="text-sm font-semibold text-white/70">Evolução do Ticket Médio</h3>
      <TableWrapper>
        <thead><tr><Th>Mês</Th><Th>Contratos</Th><Th>Valor Total</Th><Th>Ticket Médio</Th></tr></thead>
        <tbody>
          {data.evolucao_ticket.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {data.evolucao_ticket.map((r) => (
            <tr key={r.mes}><Td>{r.label}</Td><Td>{r.qtd_contratos}</Td><Td>{fmt(r.valor_total)}</Td><Td highlight>{fmt(r.ticket_medio)}</Td></tr>
          ))}
        </tbody>
      </TableWrapper>

      {/* Comissões */}
      <h3 className="text-sm font-semibold text-white/70">Comissões por Vendedor</h3>
      <TableWrapper>
        <thead><tr><Th>Vendedor</Th><Th>Contratos</Th><Th>Valor Total</Th><Th>Comissão</Th></tr></thead>
        <tbody>
          {data.comissoes.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sem dados</td></tr>}
          {data.comissoes.map((r) => (
            <tr key={r.nome}><Td>{r.nome}</Td><Td>{r.qtd_contratos}</Td><Td>{fmt(r.valor_total)}</Td><Td highlight>{fmt(r.comissao)}</Td></tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  )
}

// ── Aba Técnico ────────────────────────────────────────────────
function AbaTecnico({ data }: { data: TecnicoSummary | null }) {
  if (!data) return <EmptyState />
  return (
    <div id="print-area">
      <h2 className="text-white font-bold text-lg mb-4">Relatório Técnico</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <KpiCard label="Tempo Médio de Implantação" value={data.tempo_medio_implantacao != null ? `${data.tempo_medio_implantacao} dias` : '—'} help="Dias médios entre o contrato assinado e a obra concluída. Indicador chave para cumprimento de prazo (SLA)." />
        <KpiCard label="Total kWh Projetados" value={fmtNum(data.total_kwh_projetados, 0) + ' kWh'} help="Produção anual estimada (em quilowatt-hora) somada de todos os sistemas vendidos no período." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-2">Painéis por Fabricante</h3>
          <TableWrapper>
            <thead><tr><Th>Fabricante</Th><Th>Qtd</Th></tr></thead>
            <tbody>
              {data.modulos_por_fabricante.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-white/30">Sem dados</td></tr>}
              {data.modulos_por_fabricante.map((r) => (<tr key={r.fabricante}><Td>{r.fabricante}</Td><Td>{r.quantidade}</Td></tr>))}
            </tbody>
          </TableWrapper>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-2">Inversores por Fabricante</h3>
          <TableWrapper>
            <thead><tr><Th>Fabricante</Th><Th>Qtd</Th></tr></thead>
            <tbody>
              {data.inversores_por_fabricante.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-white/30">Sem dados</td></tr>}
              {data.inversores_por_fabricante.map((r) => (<tr key={r.fabricante}><Td>{r.fabricante}</Td><Td>{r.quantidade}</Td></tr>))}
            </tbody>
          </TableWrapper>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────
export default function RelatoriosClient() {
  const [tab, setTab] = useState<Tab>('comercial')
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()

  const [comercialData, setComercialData] = useState<ComercialSummary | null>(null)
  const [leadsOrigens, setLeadsOrigens] = useState<LeadOrigemRow[] | null>(null)
  const [leadsRanking, setLeadsRanking] = useState<RankingVendedorRow[] | null>(null)
  const [financeiroData, setFinanceiroData] = useState<FinanceiroSummary | null>(null)
  const [tecnicoData, setTecnicoData] = useState<TecnicoSummary | null>(null)
  const [posVendaData, setPosVendaData] = useState<PosVendaSummary | null>(null)
  const [slaData, setSlaData] = useState<SlaSummary | null>(null)

  const filter: RelatorioFilter = { dateFrom: dateFrom || null, dateTo: dateTo || null }

  function handleApply() {
    startTransition(async () => {
      if (tab === 'comercial') setComercialData(await getComercialData(filter))
      else if (tab === 'leads') { const d = await getLeadsData(filter); setLeadsOrigens(d.origens); setLeadsRanking(d.ranking) }
      else if (tab === 'financeiro') setFinanceiroData(await getFinanceiroData(filter))
      else if (tab === 'tecnico') setTecnicoData(await getTecnicoData(filter))
      else if (tab === 'posvenda') setPosVendaData(await getPosVendaData(filter))
      else if (tab === 'sla') setSlaData(await getSlaData())
    })
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'comercial', label: 'Comercial' },
    { key: 'leads', label: 'Leads' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'tecnico', label: 'Técnico' },
    { key: 'posvenda', label: 'Pós-Venda' },
    { key: 'sla', label: 'SLA' },
  ]

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <button className="no-print px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all" style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }} onClick={() => window.print()}>
          Baixar PDF
        </button>
      </div>

      <div className="no-print flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto max-w-full" style={{ background: 'var(--theme-surface)' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key ? { background: 'rgba(255,200,100,0.12)', color: 'var(--theme-accent)', fontWeight: 600 } : { color: 'var(--theme-text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} onApply={handleApply} isPending={isPending} />

      <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'var(--theme-surface)' }}>
        {tab === 'comercial' && <AbaComercial data={comercialData} />}
        {tab === 'leads' && <AbaLeads origens={leadsOrigens} ranking={leadsRanking} />}
        {tab === 'financeiro' && <AbaFinanceiro data={financeiroData} />}
        {tab === 'tecnico' && <AbaTecnico data={tecnicoData} />}
        {tab === 'posvenda' && <AbaPosVenda data={posVendaData} />}
        {tab === 'sla' && <AbaSla data={slaData} />}
      </div>
    </div>
  )
}

// ── Aba Pós-Venda ──────────────────────────────────────────────
function AbaPosVenda({ data }: { data: PosVendaSummary | null }) {
  if (!data) return <EmptyState />
  return (
    <div id="print-area" className="space-y-6">
      <h2 className="text-white font-bold text-lg">Relatório Pós-Venda</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="NPS Médio" value={data.nps_medio != null ? `${data.nps_medio.toFixed(1)} / 10` : '—'} help="Net Promoter Score: nota média (0-10) de satisfação dos clientes. Acima de 8 = clientes promotores." />
        <KpiCard label="Pós-Obras Realizadas" value={`${data.concluidos} / ${data.total_pos_obra}`} help="Quantidade de contatos pós-obra concluídos versus o total previsto." />
        <KpiCard label="Clientes com Expansão" value={String(data.clientes_expansao.length)} help="Clientes cujo inversor tem capacidade extra para adicionar mais painéis no futuro — potencial de nova venda." />
      </div>

      <h3 className="text-sm font-semibold text-white/70">Clientes com Potencial de Expansão</h3>
      <TableWrapper>
        <thead><tr><Th>Cliente</Th><Th>Cidade</Th><Th>Telefone</Th><Th>Potência</Th><Th>Inversor</Th><Th>Capacidade Extra</Th></tr></thead>
        <tbody>
          {data.clientes_expansao.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">Nenhum cliente com capacidade de expansão cadastrada</td></tr>}
          {data.clientes_expansao.map((c, i) => (
            <tr key={i}>
              <Td>{c.nome}</Td>
              <Td>{c.cidade ?? '—'}</Td>
              <Td>{c.telefone ? formatPhone(c.telefone) : '—'}</Td>
              <Td>{c.potencia_kwp ? `${c.potencia_kwp} kWp` : '—'}</Td>
              <Td>{c.inversor_marca ?? '—'}</Td>
              <Td highlight>{c.capacidade_extra}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  )
}

// ── Aba SLA ────────────────────────────────────────────────────
function AbaSla({ data }: { data: SlaSummary | null }) {
  if (!data) return <EmptyState />
  return (
    <div id="print-area" className="space-y-6">
      <h2 className="text-white font-bold text-lg">
        Indicadores de SLA
        <HelpTooltip content="SLA (Service Level Agreement): acordo de nível de serviço. Aqui mostra o tempo total do pipeline — do contrato à entrega." />
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Prazo Médio Total (contrato)" value={data.prazo_medio_total != null ? `${data.prazo_medio_total} dias` : '—'} help="Dias médios do contrato assinado até a entrega da obra (soma de todas as etapas)." />
      </div>

      <h3 className="text-sm font-semibold text-white/70">
        Tempo Médio por Etapa
        <HelpTooltip content="Duração média de cada fase do pipeline. Útil para identificar gargalos onde os clientes ficam parados mais tempo." />
      </h3>
      <TableWrapper>
        <thead><tr><Th>Etapa</Th><Th>Tempo Médio</Th><Th>Total Registros</Th></tr></thead>
        <tbody>
          {data.etapas.map((e) => (
            <tr key={e.etapa}>
              <Td>{e.etapa}</Td>
              <Td highlight>{e.tempo_medio_dias != null ? `${e.tempo_medio_dias} dias` : '—'}</Td>
              <Td>{e.total_registros}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  )
}

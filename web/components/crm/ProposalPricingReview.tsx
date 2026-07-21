'use client'

import { useState, useTransition, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Settings2, Pencil, XCircle } from 'lucide-react'
import type { Proposal, ProposalTemplate } from '@/lib/crm/types'
import { formatCurrency } from '@/lib/format'
import type { OrgConfig } from '@/lib/configuracoes/queries'
import { CommercialAdjustmentModal } from './CommercialAdjustmentModal'
import { applyCommercialAdjustment, removeCommercialAdjustment } from '@/lib/crm/actions'
import { TEMPLATES, TEMPLATE_PADRAO } from '@/lib/apresentacoes/templates'
import { TEMAS, TEMA_PADRAO } from '@/lib/apresentacoes/temas'

interface ProposalPricingReviewProps {
  proposal: Proposal
  orgConfig: OrgConfig
  templates: ProposalTemplate[]
  canSeePricing?: boolean
  onClose: () => void
  onGenerated: (pdfUrl: string) => void
}

type ExtraCost = {
  id: string
  categoria: string
  item: string
  qtd: number
  custo_unit: number
}

export function ProposalPricingReview({
  proposal,
  orgConfig,
  templates,
  canSeePricing = true,
  onClose,
  onGenerated,
}: ProposalPricingReviewProps) {
  const [templateApr, setTemplateApr] = useState(TEMPLATE_PADRAO)
  const [temaApr, setTemaApr] = useState(TEMPLATES[TEMPLATE_PADRAO]?.temaPadrao ?? TEMA_PADRAO)
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [progressMsg, setProgressMsg] = useState('')

  // Ajuste Comercial
  const [ajusteComercial, setAjusteComercial] = useState<{
    ajuste_tipo: string
    ajuste_valor: number
    ajuste_percentual: number
    preco_final: number
    ajuste_motivo: string
  } | null>(
    proposal.ajuste_valor != null ? {
      ajuste_tipo: proposal.ajuste_tipo!,
      ajuste_valor: proposal.ajuste_valor,
      ajuste_percentual: proposal.ajuste_percentual!,
      preco_final: proposal.preco_final!,
      ajuste_motivo: proposal.ajuste_motivo ?? '',
    } : null
  )
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [isSavingAdjust, startSavingAdjust] = useTransition()

  // Variáveis editáveis — usa overrides salvos da última geração, ou config global como fallback
  const ov = proposal.pricing_overrides
  const [vInstalacao, setVInstalacao] = useState(ov?.valor_instalacao_por_placa ?? orgConfig.valor_instalacao_por_placa ?? 0)
  const [vProjeto, setVProjeto] = useState(ov?.valor_projeto_por_kwp ?? orgConfig.valor_projeto_por_kwp ?? 0)
  const [vMaterialCa, setVMaterialCa] = useState(ov?.pct_material_ca ?? orgConfig.pct_material_ca ?? 0)
  const [vKm, setVKm] = useState(ov?.quilometragem ?? orgConfig.quilometragem ?? 0)
  const [vComissao, setVComissao] = useState(ov?.pct_comissao ?? orgConfig.pct_comissao ?? 0)
  const [vImposto, setVImposto] = useState(ov?.pct_imposto ?? orgConfig.pct_imposto ?? 0)
  const [vMargem, setVMargem] = useState(ov?.pct_margem ?? orgConfig.pct_margem ?? 0)

  type Row = {
    categoria: string
    item: string
    qtd: number | string
    custoUnit: number
    custo: number
    imposto: number
    lucro: number
    venda: number
  }

  // Memoizado: recalcula apenas quando variáveis de preço ou custos extras mudam.
  // Evita reprocessar a tabela ao alterar estado não relacionado (error, isPending, etc).
  const { rows, totals } = useMemo(() => {
    const pct_imposto  = vImposto / 100
    const pct_margem   = vMargem / 100
    const pct_comissao = vComissao / 100
    const pct_ca       = vMaterialCa / 100
    const divisor = 1 - pct_imposto - pct_margem - pct_comissao
    const d = divisor > 0 ? divisor : 1
    const km_rodados = proposal.km_rodados ?? 0

    function buildRow(categoria: string, item: string, qtd: number | string, custoUnit: number, custo: number): Row {
      const venda = custo / d
      return {
        categoria, item, qtd, custoUnit, custo,
        imposto: venda * pct_imposto,
        lucro: venda * pct_margem,
        venda,
      }
    }

    const computed: Row[] = [
      buildRow('Kit', 'Equipamentos', 1, proposal.kit_value, proposal.kit_value),
      buildRow('Projeto', 'Engenharia elétrica', proposal.total_power_kwp.toFixed(2) + ' kWp', vProjeto, proposal.total_power_kwp * vProjeto),
      buildRow('Instalação', 'Mão de obra', proposal.panel_qty, vInstalacao, proposal.panel_qty * vInstalacao),
      buildRow('Quilometragem', 'Deslocamento', km_rodados, vKm, vKm * km_rodados),
      buildRow('Material CA', `${vMaterialCa}% sobre kit`, 1, proposal.kit_value * pct_ca, proposal.kit_value * pct_ca),
    ]

    for (const ec of extraCosts) {
      const custo = ec.qtd * ec.custo_unit
      computed.push(buildRow(ec.categoria || 'Extra', ec.item || '—', ec.qtd, ec.custo_unit, custo))
    }

    const totals = computed.reduce(
      (acc, r) => ({ custo: acc.custo + r.custo, imposto: acc.imposto + r.imposto, lucro: acc.lucro + r.lucro, venda: acc.venda + r.venda }),
      { custo: 0, imposto: 0, lucro: 0, venda: 0 }
    )

    return { rows: computed, totals }
  }, [vInstalacao, vProjeto, vMaterialCa, vKm, vComissao, vImposto, vMargem, extraCosts, proposal])

  // Recalcula o ajuste comercial quando as variáveis mudam
  const ajusteRecalculado = useMemo(() => {
    if (!ajusteComercial) return null
    const { ajuste_tipo, ajuste_percentual, ajuste_valor, ajuste_motivo } = ajusteComercial
    if (ajuste_tipo === 'percentual') {
      const novoValor = totals.venda * ajuste_percentual
      return { ...ajusteComercial, ajuste_valor: novoValor, preco_final: totals.venda + novoValor }
    }
    if (ajuste_tipo === 'valor') {
      const novoPct = totals.venda !== 0 ? ajuste_valor / totals.venda : 0
      return { ...ajusteComercial, ajuste_percentual: novoPct, preco_final: totals.venda + ajuste_valor }
    }
    // valor_final: preço fixo negociado — recalcula o delta
    const novoAjusteValor = ajusteComercial.preco_final - totals.venda
    const novoPct2 = totals.venda !== 0 ? novoAjusteValor / totals.venda : 0
    return { ...ajusteComercial, ajuste_valor: novoAjusteValor, ajuste_percentual: novoPct2 }
  }, [ajusteComercial, totals.venda])

  // Preço exibido no resumo: valor final negociado (com ajuste) ou valor calculado
  const precoExibido = ajusteRecalculado?.preco_final ?? totals.venda

  async function handleApplyAdjustment(data: {
    ajuste_tipo: string
    ajuste_valor: number
    ajuste_percentual: number
    preco_final: number
    ajuste_motivo: string
  }) {
    startSavingAdjust(async () => {
      const result = await applyCommercialAdjustment(proposal.id, {
        ajuste_tipo: data.ajuste_tipo as 'percentual' | 'valor' | 'valor_final',
        ajuste_valor: data.ajuste_valor,
        ajuste_percentual: data.ajuste_percentual,
        preco_calculado: totals.venda,
        preco_final: data.preco_final,
        ajuste_motivo: data.ajuste_motivo,
      })
      if (!result.error) setAjusteComercial(data)
    })
  }

  async function handleRemoveAdjustment() {
    startSavingAdjust(async () => {
      const result = await removeCommercialAdjustment(proposal.id)
      if (!result.error) setAjusteComercial(null)
    })
  }

  function addExtraCost() {
    setExtraCosts((prev) => [...prev, { id: crypto.randomUUID(), categoria: '', item: '', qtd: 1, custo_unit: 0 }])
  }

  function updateExtra(id: string, field: keyof ExtraCost, value: string | number) {
    setExtraCosts((prev) => prev.map((ec) => ec.id === id ? { ...ec, [field]: value } : ec))
  }

  function removeExtra(id: string) {
    setExtraCosts((prev) => prev.filter((ec) => ec.id !== id))
  }

  function handleGenerate() {
    setError(null)

    startTransition(async () => {
      setProgressMsg('Preparando dados e calculando preços...')

      const timeoutId = setTimeout(() => {
        setProgressMsg('Processando template e convertendo para PDF...')
      }, 3000)

      try {
        const res = await fetch(`/api/proposals/${proposal.id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposalId: proposal.id,
            template: templateApr,
            tema: temaApr,
            overrides: {
              valor_instalacao_por_placa: vInstalacao,
              valor_projeto_por_kwp: vProjeto,
              pct_material_ca: vMaterialCa,
              quilometragem: vKm,
              pct_comissao: vComissao,
              pct_imposto: vImposto,
              pct_margem: vMargem,
            },
            extras: extraCosts.map((ec) => ({
              categoria: ec.categoria,
              item: ec.item,
              qtd: ec.qtd,
              custo_unit: ec.custo_unit,
            })),
            ajuste_comercial: ajusteRecalculado ?? null,
          }),
        })

        clearTimeout(timeoutId)
        const data = await res.json()
        if (!res.ok || data.error) {
          setError(data.error ?? 'Erro ao gerar orçamento.')
          setProgressMsg('')
          return
        }

        setProgressMsg('')
        const url = `${window.location.origin}${data.apresentacao_path}`
        setLinkGerado(url)
        onGenerated(url)
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)
        setProgressMsg('')
        setError(fetchErr?.message === 'Failed to fetch'
          ? 'Erro de conexão. Verifique sua internet e tente novamente.'
          : fetchErr?.message ?? 'Erro inesperado.')
      }
    })
  }

  const labelCls = 'text-xs text-white/50 mb-1 block'
  const thCls = 'text-[10px] font-semibold uppercase tracking-wide text-white/40 py-2 px-2 text-left'
  const tdCls = 'text-xs text-white/70 py-2 px-2 whitespace-nowrap'
  const inputSmCls = 'w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none border border-white/10 focus:border-white/30 bg-white/5'
  const varInputCls = 'w-full px-3 py-2 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 bg-white/5'

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-[71] flex flex-col"
        style={{
          width: 'calc(100vw - 180px)',
          background: 'var(--theme-drawer-bg)',
          borderLeft: '1px solid var(--theme-card-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="h-14 flex items-center justify-between px-6 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <h2 className="text-sm font-bold text-white">Gerar Orçamento</h2>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/10">
            <X size={16} style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info do sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,200,100,0.04)', border: '1px solid rgba(255,200,100,0.10)' }}>
              <p className="text-[10px] text-white/35 uppercase tracking-wide">Sistema</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-accent)' }}>{proposal.total_power_kwp.toFixed(2)} kWp</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,200,100,0.04)', border: '1px solid rgba(255,200,100,0.10)' }}>
              <p className="text-[10px] text-white/35 uppercase tracking-wide">Geração/mês</p>
              <p className="text-sm font-semibold text-white/70">{Math.round(proposal.monthly_generation_kwh)} kWh</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,200,100,0.04)', border: '1px solid rgba(255,200,100,0.10)' }}>
              <p className="text-[10px] text-white/35 uppercase tracking-wide">R$/kWp</p>
              <p className="text-sm font-semibold text-white/70">
                {proposal.total_power_kwp > 0 ? formatCurrency(totals.venda / proposal.total_power_kwp) : '—'}
              </p>
            </div>
          </div>

          {/* Tabela de composição — visível apenas para quem tem permissão ver_precificacao */}
          {canSeePricing && <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--theme-card-border)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--theme-surface)' }}>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Composição do Preço</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
                    <th className={thCls}>Categoria</th>
                    <th className={thCls}>Item</th>
                    <th className={`${thCls} text-right`}>Qtd.</th>
                    <th className={`${thCls} text-right`}>Custo unit.</th>
                    <th className={`${thCls} text-right`}>Custo</th>
                    <th className={`${thCls} text-right`}>Imposto</th>
                    <th className={`${thCls} text-right`}>Lucro</th>
                    <th className={`${thCls} text-right`}>Venda</th>
                    <th className={thCls} style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const isExtra = i >= rows.length - extraCosts.length
                    const extraIdx = i - (rows.length - extraCosts.length)
                    const ec = isExtra ? extraCosts[extraIdx] : null

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                        <td className={tdCls}>
                          {isExtra && ec ? (
                            <input className={inputSmCls} value={ec.categoria} onChange={(e) => updateExtra(ec.id, 'categoria', e.target.value)} placeholder="Categoria" style={{ width: 90 }} />
                          ) : r.categoria}
                        </td>
                        <td className={tdCls}>
                          {isExtra && ec ? (
                            <input className={inputSmCls} value={ec.item} onChange={(e) => updateExtra(ec.id, 'item', e.target.value)} placeholder="Descrição" style={{ width: 120 }} />
                          ) : r.item}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          {isExtra && ec ? (
                            <input className={`${inputSmCls} text-right`} type="number" min="0" step="0.01" value={ec.qtd} onChange={(e) => updateExtra(ec.id, 'qtd', parseFloat(e.target.value) || 0)} style={{ width: 60 }} />
                          ) : r.qtd}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          {isExtra && ec ? (
                            <input className={`${inputSmCls} text-right`} type="number" min="0" step="0.01" value={ec.custo_unit} onChange={(e) => updateExtra(ec.id, 'custo_unit', parseFloat(e.target.value) || 0)} style={{ width: 80 }} />
                          ) : formatCurrency(r.custoUnit)}
                        </td>
                        <td className={`${tdCls} text-right`}>{formatCurrency(r.custo)}</td>
                        <td className={`${tdCls} text-right`}>{formatCurrency(r.imposto)}</td>
                        <td className={`${tdCls} text-right`}>{formatCurrency(r.lucro)}</td>
                        <td className={`${tdCls} text-right font-medium`}>{formatCurrency(r.venda)}</td>
                        <td className={tdCls}>
                          {isExtra && ec && (
                            <button onClick={() => removeExtra(ec.id)} className="p-1 rounded hover:bg-white/10 transition-colors">
                              <Trash2 size={12} style={{ color: 'rgba(255,80,80,0.5)' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--theme-input-border)' }}>
                    <td colSpan={4} className={`${tdCls} font-semibold text-white`}>
                      {ajusteRecalculado ? 'Valor Calculado' : 'Total'}
                    </td>
                    <td className={`${tdCls} text-right font-semibold text-white`}>{formatCurrency(totals.custo)}</td>
                    <td className={`${tdCls} text-right font-semibold text-white`}>{formatCurrency(totals.imposto)}</td>
                    <td className={`${tdCls} text-right font-semibold text-white`}>{formatCurrency(totals.lucro)}</td>
                    <td className={`${tdCls} text-right font-bold text-base`} style={{ color: ajusteRecalculado ? 'var(--theme-text-muted)' : 'var(--theme-accent)' }}>
                      {formatCurrency(totals.venda)}
                    </td>
                    <td></td>
                  </tr>
                  {ajusteRecalculado && (
                    <>
                      <tr>
                        <td colSpan={7} className={`${tdCls}`}>
                          <span className="text-white/40">Ajuste Comercial</span>
                          <span
                            className="ml-2 text-xs font-medium"
                            style={{ color: ajusteRecalculado.ajuste_valor < 0 ? 'rgba(248,113,113,0.9)' : 'rgba(52,211,153,0.9)' }}
                          >
                            {ajusteRecalculado.ajuste_valor >= 0 ? '+' : ''}
                            {formatCurrency(ajusteRecalculado.ajuste_valor)}
                            {' '}
                            ({ajusteRecalculado.ajuste_percentual >= 0 ? '+' : ''}{(ajusteRecalculado.ajuste_percentual * 100).toFixed(2)}%)
                          </span>
                          {ajusteRecalculado.ajuste_motivo && (
                            <span className="ml-2 text-white/30 text-[10px]">— {ajusteRecalculado.ajuste_motivo}</span>
                          )}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowAdjustModal(true)}
                              disabled={isSavingAdjust}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                              title="Editar ajuste"
                            >
                              <Pencil size={11} style={{ color: 'var(--theme-text-muted)' }} />
                            </button>
                            <button
                              onClick={handleRemoveAdjustment}
                              disabled={isSavingAdjust}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                              title="Remover ajuste"
                            >
                              <XCircle size={11} style={{ color: 'rgba(248,113,113,0.6)' }} />
                            </button>
                          </div>
                        </td>
                        <td></td>
                      </tr>
                      <tr style={{ borderTop: '1px solid var(--theme-input-border)' }}>
                        <td colSpan={7} className={`${tdCls} font-bold text-white`}>Valor Final</td>
                        <td className={`${tdCls} text-right font-bold text-base`} style={{ color: 'var(--theme-accent)' }}>
                          {formatCurrency(precoExibido)}
                        </td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>

            <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--theme-border)' }}>
              <button onClick={addExtraCost} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                <Plus size={13} /> Adicionar custo extra
              </button>
              {!ajusteRecalculado && (
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: 'var(--theme-accent)', opacity: 0.8 }}
                >
                  <Pencil size={11} /> Ajuste Comercial
                </button>
              )}
            </div>
          </div>}

          {/* Variáveis da proposta — apenas para quem tem permissão ver_precificacao */}
          {canSeePricing && <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--theme-card-border)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--theme-surface)' }}>
              <Settings2 size={13} style={{ color: 'var(--theme-text-subtle)' }} />
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Variáveis desta Proposta</p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Instalação (R$/placa)</label>
                <input type="number" min="0" step="0.01" value={vInstalacao} onChange={(e) => setVInstalacao(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
              <div>
                <label className={labelCls}>Projeto (R$/kWp)</label>
                <input type="number" min="0" step="0.01" value={vProjeto} onChange={(e) => setVProjeto(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
              <div>
                <label className={labelCls}>Material CA (% kit)</label>
                <input type="number" min="0" step="0.1" value={vMaterialCa} onChange={(e) => setVMaterialCa(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
              <div>
                <label className={labelCls}>Km rodado (R$/km)</label>
                <input type="number" min="0" step="0.01" value={vKm} onChange={(e) => setVKm(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
              <div>
                <label className={labelCls}>Comissão (%)</label>
                <input type="number" min="0" step="0.1" value={vComissao} onChange={(e) => setVComissao(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
              <div>
                <label className={labelCls}>Imposto (%)</label>
                <input type="number" min="0" step="0.1" value={vImposto} onChange={(e) => setVImposto(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
              <div>
                <label className={labelCls}>Margem de lucro (%)</label>
                <input type="number" min="0" step="0.1" value={vMargem} onChange={(e) => setVMargem(parseFloat(e.target.value) || 0)} className={varInputCls} />
              </div>
            </div>
          </div>}

          {/* Equipamentos da proposta */}
          {(proposal.panel_qty > 0 || proposal.inverter_qty > 0) && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--theme-card-border)' }}>
              <div className="px-4 py-3" style={{ background: 'var(--theme-surface)' }}>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Equipamentos</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {proposal.panel_qty > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Placas</p>
                    <p className="text-sm font-semibold text-white/80">{proposal.panel_qty}x unidades</p>
                    {proposal.panel_brand_model && (
                      <p className="text-xs text-white/50 mt-0.5">{proposal.panel_brand_model}</p>
                    )}
                    {proposal.panel_power_w > 0 && (
                      <p className="text-xs text-white/40">{proposal.panel_power_w}W / placa</p>
                    )}
                  </div>
                )}
                {proposal.inverter_qty > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Inversores</p>
                    <p className="text-sm font-semibold text-white/80">{proposal.inverter_qty}x unidades</p>
                    {proposal.inverter_brand_model && (
                      <p className="text-xs text-white/50 mt-0.5">{proposal.inverter_brand_model}</p>
                    )}
                    {proposal.inverter_power_w > 0 && (
                      <p className="text-xs text-white/40">{(proposal.inverter_power_w / 1000).toFixed(1)} kW / inversor</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Apresentação: template e tema */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Modelo da Apresentação</label>
              <select
                value={templateApr}
                onChange={(e) => {
                  const id = e.target.value
                  setTemplateApr(id)
                  // Cada modelo tem seu tema natural; o usuário ainda pode trocar.
                  setTemaApr(TEMPLATES[id]?.temaPadrao ?? TEMA_PADRAO)
                }}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                style={{ background: 'var(--theme-input-bg)' }}
              >
                {Object.values(TEMPLATES).map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-subtle)' }}>
                {TEMPLATES[templateApr]?.descricao}
              </p>
            </div>

            <div>
              <label className={labelCls}>Tema</label>
              <div className="flex items-center gap-2">
                <select
                  value={temaApr}
                  onChange={(e) => setTemaApr(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                  style={{ background: 'var(--theme-input-bg)' }}
                >
                  {Object.values(TEMAS).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                <span
                  className="w-8 h-8 rounded-lg flex-shrink-0 border border-white/10"
                  style={{ background: TEMAS[temaApr]?.corDestaque ?? '#10B981' }}
                  title="Cor de destaque do tema"
                />
              </div>
            </div>
          </div>

          {linkGerado && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <p className="text-sm font-semibold text-green-400">Orçamento gerado</p>
              <p className="text-[11px] font-mono break-all" style={{ color: 'var(--theme-text-muted)' }}>{linkGerado}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(linkGerado)
                    setCopiado(true)
                    setTimeout(() => setCopiado(false), 2000)
                  }}
                  className="flex-1 text-xs py-2 rounded-lg border border-green-500/40 text-green-400 transition-colors hover:bg-green-500/10"
                >
                  {copiado ? 'Copiado!' : 'Copiar link'}
                </button>
                <a
                  href={linkGerado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs py-2 rounded-lg border border-green-500/40 text-green-400 text-center transition-colors hover:bg-green-500/10"
                >
                  Abrir apresentação
                </a>
              </div>
            </div>
          )}

            {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--theme-border)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-white/50 border border-white/10 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            {isPending ? (progressMsg || 'Gerando...') : linkGerado ? 'Gerar novamente' : 'Gerar Orçamento'}
          </button>
        </div>
      </div>
      {showAdjustModal && (
        <CommercialAdjustmentModal
          precoCalculado={totals.venda}
          ajusteAtual={ajusteRecalculado ? {
            valor: ajusteRecalculado.ajuste_valor,
            percentual: ajusteRecalculado.ajuste_percentual,
            motivo: ajusteRecalculado.ajuste_motivo,
            tipo: ajusteRecalculado.ajuste_tipo,
          } : null}
          onApply={handleApplyAdjustment}
          onRemove={handleRemoveAdjustment}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </>,
    document.body
  )
}

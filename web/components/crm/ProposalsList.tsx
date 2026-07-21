'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { ProposalForm } from './ProposalForm'
import { ProposalPricingReview } from './ProposalPricingReview'
import { deleteProposal, duplicateProposal } from '@/lib/crm/actions'
import type { Lead, Proposal, Supplier, ProposalTemplate } from '@/lib/crm/types'
import type { OrgConfig } from '@/lib/configuracoes/queries'
import { formatCurrency } from '@/lib/format'
import { secureStorageUrl } from '@/lib/storage/url'
import type { KitPublic } from '@/lib/catalogo/kit-actions'
import { generateProposalLink, getProposalLink, getPresentationConfig } from '@/lib/proposals/link-actions'
import { ApresentacaoConfigurador } from './ApresentacaoConfigurador'
import type { ApresentacaoConfig } from '@/lib/apresentacoes/tipos'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  cancelled: 'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--theme-text-muted)',
  sent: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: 'var(--theme-text-subtle)',
}

function ProposalLinkButton({ proposalId }: { proposalId: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProposalLink(proposalId).then((result) => {
      if (!cancelled && result?.token) setToken(result.token)
    })
    return () => { cancelled = true }
  }, [proposalId])

  async function handleClick() {
    if (token) {
      const url = `${window.location.origin}/proposta/${token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }
    setLoading(true)
    const result = await generateProposalLink(proposalId)
    setLoading(false)
    if (result.token) setToken(result.token)
    else if (result.error) alert(result.error)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-muted)', border: '1px solid var(--theme-border)' }}
    >
      {loading ? 'Gerando...' : copied ? 'Copiado!' : token ? 'Copiar link' : 'Gerar link'}
    </button>
  )
}

function ApresentacaoConfiguradorLoader({ proposalId }: { proposalId: string }) {
  const [config, setConfig] = useState<ApresentacaoConfig | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPresentationConfig(proposalId).then((result) => {
      if (!cancelled) {
        setConfig(result)
        setLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [proposalId])

  if (!loaded) return null
  return <ApresentacaoConfigurador proposalId={proposalId} configInicial={config} />
}

export function ProposalsList({ lead }: { lead: Lead }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [generationFactor, setGenerationFactor] = useState(1.0)
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null)
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [reviewProposal, setReviewProposal] = useState<Proposal | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showKitModal, setShowKitModal] = useState(false)
  const [kits, setKits] = useState<KitPublic[]>([])
  const [kitsLoading, setKitsLoading] = useState(false)
  const [canSeePricing, setCanSeePricing] = useState(true)

  useEffect(() => {
    fetch(`/api/leads/${lead.id}/proposals`)
      .then((r) => r.json())
      .then(({ proposals, suppliers, generationFactor, orgConfig, templates, canSeePricing: csp }) => {
        setProposals(proposals)
        setSuppliers(suppliers)
        setGenerationFactor(generationFactor)
        if (orgConfig) setOrgConfig(orgConfig)
        if (templates) setTemplates(templates)
        if (typeof csp === 'boolean') setCanSeePricing(csp)
      })
  }, [lead.id])

  function handleDelete(id: string) {
    if (!confirm('Excluir proposta?')) return
    startTransition(async () => {
      await deleteProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
    })
  }

  async function openKitModal() {
    setShowKitModal(true)
    if (kits.length === 0) {
      setKitsLoading(true)
      const res = await fetch('/api/kits')
      if (res.ok) {
        const data = await res.json()
        setKits(data.kits ?? [])
      }
      setKitsLoading(false)
    }
  }

  function handleSelectKit(kit: KitPublic) {
    setShowKitModal(false)
    // Pre-fill a new proposal form from kit data — handled by ProposalForm via kitData prop
    // We create the proposal directly via server action
    startTransition(async () => {
      const { createProposalFromKit } = await import('@/lib/crm/actions')
      const result = await createProposalFromKit(lead.id, kit.id)
      if (result.error) { alert(result.error); return }
      const r = await fetch(`/api/leads/${lead.id}/proposals`)
      const { proposals: newProposals } = await r.json()
      setProposals(newProposals)
    })
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateProposal(id)
      if (result.error) return
      const r = await fetch(`/api/leads/${lead.id}/proposals`)
      const { proposals } = await r.json()
      setProposals(proposals)
    })
  }

  function handleGenerated(proposalId: string, pdfUrl: string) {
    setProposals((prev) =>
      prev.map((p) => p.id === proposalId ? { ...p, pdf_url: pdfUrl } : p)
    )
    setReviewProposal(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {reviewProposal && orgConfig && (
        <ProposalPricingReview
          proposal={reviewProposal}
          orgConfig={orgConfig}
          templates={templates}
          canSeePricing={canSeePricing}
          onClose={() => setReviewProposal(null)}
          onGenerated={(url) => handleGenerated(reviewProposal.id, url)}
        />
      )}

      {/* Kit selection modal */}
      {showKitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl border border-white/10 p-6 w-full max-w-2xl max-h-[80vh] flex flex-col gap-4" style={{ background: 'var(--theme-surface)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Selecionar Kit</h3>
              <button onClick={() => setShowKitModal(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>
            {kitsLoading ? (
              <p className="text-sm text-white/40 text-center py-8">Carregando kits...</p>
            ) : kits.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">Nenhum kit ativo cadastrado.</p>
            ) : (
              <div className="overflow-y-auto flex flex-col gap-3">
                {kits.map(kit => (
                  <button
                    key={kit.id}
                    onClick={() => handleSelectKit(kit)}
                    disabled={isPending}
                    className="text-left rounded-xl border border-white/10 p-4 hover:border-yellow-400/40 transition-colors disabled:opacity-50"
                    style={{ background: 'var(--theme-input-bg)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{kit.name}</p>
                        {kit.code && <p className="text-xs text-white/40">{kit.code}</p>}
                        {kit.description && <p className="text-xs text-white/50 mt-1">{kit.description}</p>}
                      </div>
                      {kit.sale_price && (
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--theme-accent)' }}>
                          {formatCurrency(kit.sale_price)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-white/40">Potência</p>
                        <p className="text-xs text-white/80">{kit.total_power_kwp ? `${kit.total_power_kwp.toFixed(2)} kWp` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40">Geração/mês</p>
                        <p className="text-xs text-white/80">{kit.monthly_generation_kwh ? `${kit.monthly_generation_kwh.toFixed(0)} kWh` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40">Painéis</p>
                        <p className="text-xs text-white/80">{kit.panel_qty}x {kit.panel_brand ?? ''} {kit.panel_model ?? ''}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!showForm ? (
        <div className="flex items-center gap-2">
          <Button className="self-start text-xs py-1.5 px-4" onClick={() => setShowForm(true)}>
            + Nova Proposta
          </Button>
          <button
            onClick={openKitModal}
            className="text-xs py-1.5 px-4 rounded-lg font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-muted)', border: '1px solid var(--theme-border)' }}
          >
            Proposta por Kit
          </button>
        </div>
      ) : (
        <ProposalForm
          leadId={lead.id}
          suppliers={suppliers}
          generationFactor={generationFactor}
          onSuccess={() => {
            setShowForm(false)
            fetch(`/api/leads/${lead.id}/proposals`)
              .then((r) => r.json())
              .then(({ proposals }) => setProposals(proposals))
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {proposals.length === 0 && !showForm && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--theme-text-subtle)' }}>
          Nenhuma proposta criada ainda.
        </p>
      )}

      {proposals.map((p) => (
        <div
          key={p.id}
          className="rounded-xl p-4"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
              {p.name}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: `${STATUS_COLORS[p.status]}20`,
                color: STATUS_COLORS[p.status],
                border: `1px solid ${STATUS_COLORS[p.status]}40`,
              }}
            >
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Sistema</p>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-accent)' }}>
                {p.total_power_kwp.toFixed(2)} kWp
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Geração/mês</p>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {p.monthly_generation_kwh.toFixed(0)} kWh
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
                {p.preco_final ?? p.preco_total ? 'Preço Total' : 'Valor kit'}
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {p.preco_final
                  ? formatCurrency(p.preco_final)
                  : p.preco_total
                    ? formatCurrency(p.preco_total)
                    : p.kit_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          {/* Equipamentos */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
            {p.panel_qty > 0 && (
              <div>
                <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Placas</p>
                <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {p.panel_qty}x {p.panel_brand_model ?? `${p.panel_power_w}W`}
                </p>
              </div>
            )}
            {p.inverter_qty > 0 && (
              <div>
                <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Inversores</p>
                <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {p.inverter_qty}x {p.inverter_brand_model ?? `${(p.inverter_power_w / 1000).toFixed(1)}kW`}
                </p>
              </div>
            )}
          </div>
          {p.supplier && (
            <p className="text-xs mt-2" style={{ color: 'var(--theme-text-subtle)' }}>
              Fornecedor: {p.supplier.name}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {p.pdf_url && (
                <a
                  href={secureStorageUrl(p.pdf_url) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,208,128,0.15)', color: 'var(--theme-accent)', border: '1px solid rgba(255,208,128,0.3)' }}
                >
                  ↓ PDF
                </a>
              )}
              <button
                onClick={() => setReviewProposal(p)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
              >
                {p.pdf_url ? 'Editar Orçamento' : 'Gerar Orçamento'}
              </button>
              <button
                onClick={() => handleDuplicate(p.id)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-muted)', border: '1px solid var(--theme-border)' }}
              >
                Duplicar
              </button>
              <ProposalLinkButton proposalId={p.id} />
              <ApresentacaoConfiguradorLoader proposalId={p.id} />
            </div>
            <button
              onClick={() => handleDelete(p.id)}
              disabled={isPending}
              className="text-xs"
              style={{ color: 'rgba(255,80,80,0.50)' }}
            >
              excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

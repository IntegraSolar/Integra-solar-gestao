'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { ProposalForm } from './ProposalForm'
import { ProposalPricingReview } from './ProposalPricingReview'
import { deleteProposal } from '@/lib/crm/actions'
import type { Lead, Proposal, Supplier, ProposalTemplate } from '@/lib/crm/types'
import type { OrgConfig } from '@/lib/configuracoes/queries'
import { formatCurrency } from '@/lib/format'
import { secureStorageUrl } from '@/lib/storage/url'

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

export function ProposalsList({ lead }: { lead: Lead }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [generationFactor, setGenerationFactor] = useState(1.0)
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null)
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [reviewProposal, setReviewProposal] = useState<Proposal | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch(`/api/leads/${lead.id}/proposals`)
      .then((r) => r.json())
      .then(({ proposals, suppliers, generationFactor, orgConfig, templates }) => {
        setProposals(proposals)
        setSuppliers(suppliers)
        setGenerationFactor(generationFactor)
        if (orgConfig) setOrgConfig(orgConfig)
        if (templates) setTemplates(templates)
      })
  }, [lead.id])

  function handleDelete(id: string) {
    if (!confirm('Excluir proposta?')) return
    startTransition(async () => {
      await deleteProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
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
          onClose={() => setReviewProposal(null)}
          onGenerated={(url) => handleGenerated(reviewProposal.id, url)}
        />
      )}

      {!showForm ? (
        <Button className="self-start text-xs py-1.5 px-4" onClick={() => setShowForm(true)}>
          + Nova Proposta
        </Button>
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
                {p.pdf_url ? 'Regerar Orçamento' : 'Gerar Orçamento'}
              </button>
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

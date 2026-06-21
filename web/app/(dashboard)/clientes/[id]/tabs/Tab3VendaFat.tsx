// web/app/(dashboard)/clientes/[id]/tabs/Tab3VendaFat.tsx
'use client'

import { useState, useEffect } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { CurrencyInput, PercentInput, DatePicker } from '@/components/ui/inputs'
import { formatCurrency } from '@/lib/format'
import { updateTab3 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

interface Installment {
  position: number
  due_date: string
  amount: number
  notes: string
}

type ProposalOption = {
  id: string
  name: string
  preco_total: number | null
  total_power_kwp: number
}

const selectStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg)',
  border: '1px solid var(--theme-input-border)',
  color: 'var(--theme-input-text)',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--theme-text-muted)',
  marginBottom: 6,
  display: 'block',
}

export function Tab3VendaFat({ client }: { client: Client }) {
  const action = updateTab3.bind(null, client.id)

  const [proposals, setProposals] = useState<ProposalOption[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [proposalValue, setProposalValue] = useState<number | null>(null)
  const [saleValue, setSaleValue] = useState<number>(client.sale?.sale_value ?? 0)

  useEffect(() => {
    if (client.lead_id) {
      fetch(`/api/leads/${client.lead_id}/proposals`)
        .then((r) => r.json())
        .then((data) => {
          if (data.proposals) setProposals(data.proposals)
        })
    }
  }, [client.lead_id])

  function handleProposalChange(id: string) {
    setSelectedProposalId(id)
    const p = proposals.find((x) => x.id === id)
    if (p?.preco_total) {
      setProposalValue(p.preco_total)
    } else {
      setProposalValue(null)
    }
  }

  const initialInstallments: Installment[] = client.installments.map((inst) => ({
    position: inst.position,
    due_date: inst.due_date,
    amount: inst.amount,
    notes: inst.notes ?? '',
  }))

  const [installments, setInstallments] = useState<Installment[]>(
    initialInstallments.length > 0
      ? initialInstallments
      : [{ position: 1, due_date: '', amount: 0, notes: '' }]
  )

  const totalInstallments = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const installmentsMismatch = saleValue > 0 && Math.abs(totalInstallments - saleValue) > 0.01

  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      if (installmentsMismatch) {
        return { error: `A soma das parcelas (${formatCurrency(totalInstallments)}) não bate com o valor total da venda (${formatCurrency(saleValue)}).` }
      }
      formData.set('installments_json', JSON.stringify(installments))
      if (selectedProposalId) formData.set('proposal_id', selectedProposalId)
      return action(prev, formData)
    },
    {} as ActionResult
  )

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { position: prev.length + 1, due_date: '', amount: 0, notes: '' },
    ])
  }

  function removeInstallment(idx: number) {
    setInstallments((prev) =>
      prev.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, position: i + 1 }))
    )
  }

  function updateInstallment(idx: number, field: keyof Installment, value: string | number) {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === idx ? { ...inst, [field]: value } : inst))
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {/* Dados da venda */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Dados da Venda
        </p>

        {/* Seletor de proposta */}
        {proposals.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Proposta</label>
            <select
              value={selectedProposalId}
              onChange={(e) => handleProposalChange(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Selecione uma proposta —</option>
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.total_power_kwp.toFixed(2)} kWp
                  {p.preco_total ? ` — ${formatCurrency(p.preco_total)}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Valor da proposta (auto-preenchido) */}
        {proposalValue !== null && (
          <div
            className="rounded-xl p-3 flex items-center justify-between"
            style={{ background: 'rgba(255,200,100,0.04)', border: '1px solid rgba(255,200,100,0.10)' }}
          >
            <span className="text-xs text-white/50 uppercase tracking-wide">Valor da proposta</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-accent)' }}>{formatCurrency(proposalValue)}</span>
          </div>
        )}

        <CurrencyInput
          name="sale_value"
          label="Valor total da venda (R$) *"
          value={saleValue || null}
          onChange={(v) => setSaleValue(v)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Forma de pagamento</label>
          <select name="payment_method" defaultValue={client.sale?.payment_method ?? ''} style={selectStyle}>
            <option value="">— Selecione —</option>
            <option value="financiamento">Financiamento</option>
            <option value="a_vista">À Vista</option>
            <option value="parcelado_cartao">Parcelado no Cartão</option>
            <option value="consorcio">Consórcio</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PercentInput
            name="commission_pct"
            label="Comissão (%)"
            value={client.sale?.commission_pct ?? null}
          />
          <Input
            name="commission_seller"
            label="Vendedor (comissão)"
            defaultValue={(client.sale as any)?.commission_seller ?? ''}
            placeholder="Nome do vendedor"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Observações NF</label>
          <textarea
            name="nf_notes"
            defaultValue={client.sale?.nf_notes ?? ''}
            placeholder="Observações para nota fiscal..."
            rows={2}
            style={{ ...selectStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Parcelas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
            Parcelas
          </p>
          <span
            className="text-xs"
            style={{ color: installmentsMismatch ? '#EF4444' : 'var(--theme-text-subtle)' }}
          >
            Total: {formatCurrency(totalInstallments)}
          </span>
        </div>

        {installmentsMismatch && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
          >
            A soma das parcelas ({formatCurrency(totalInstallments)}) deve ser igual ao valor total da venda ({formatCurrency(saleValue)}).
          </p>
        )}

        {installments.map((inst, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: idx === 0 ? 'var(--theme-accent)' : 'var(--theme-text-muted)' }}>
                {idx === 0 ? 'Parcela 1 (Entrada)' : `Parcela ${idx + 1}`}
              </span>
              {installments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInstallment(idx)}
                  className="text-xs"
                  style={{ color: 'rgba(255,80,80,0.50)' }}
                >
                  remover
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                label="Vencimento"
                value={inst.due_date || null}
                onChange={(iso) => updateInstallment(idx, 'due_date', iso)}
                required
              />
              <CurrencyInput
                label="Valor (R$)"
                value={inst.amount || null}
                onChange={(v) => updateInstallment(idx, 'amount', v)}
                required
              />
            </div>
            <input
              type="text"
              value={inst.notes}
              onChange={(e) => updateInstallment(idx, 'notes', e.target.value)}
              placeholder="Observação (opcional)"
              style={{ ...selectStyle, padding: '7px 12px', fontSize: 13 }}
            />
          </div>
        ))}

        <Button type="button" variant="secondary" className="self-start text-xs py-1.5" onClick={addInstallment}>
          + Adicionar parcela
        </Button>
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Venda e Faturamento</SubmitButton>
    </form>
  )
}

'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { PhoneInput } from '@/components/ui/inputs'
import { createLead, updateLead } from '@/lib/crm/actions'
import type { Lead, FunnelStage, LeadSource, LeadUser, ActionResult } from '@/lib/crm/types'

interface LeadFormProps {
  lead?: Lead
  stages: FunnelStage[]
  sources: LeadSource[]
  members: LeadUser[]
  onSuccess?: () => void
}

export function LeadForm({ lead, stages, sources, members, onSuccess }: LeadFormProps) {
  const action = lead
    ? updateLead.bind(null, lead.id)
    : createLead

  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData)
      if (result.success && onSuccess) onSuccess()
      return result
    },
    {}
  )

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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        name="name"
        label="Nome *"
        defaultValue={lead?.name}
        placeholder="Nome do lead"
        required
      />
      <PhoneInput
        name="phone"
        label="Telefone"
        value={lead?.phone ?? ''}
      />
      <Input
        name="city"
        label="Cidade"
        defaultValue={lead?.city ?? ''}
        placeholder="Cidade"
      />
      <Input
        name="address"
        label="Endereço"
        defaultValue={lead?.address ?? ''}
        placeholder="Rua, número"
      />
      <Input
        name="avg_kwh"
        label="Consumo médio (kWh/mês)"
        type="number"
        defaultValue={lead?.avg_kwh?.toString() ?? ''}
        placeholder="Ex: 350"
      />
      <Input
        name="installation_type"
        label="Tipo de instalação"
        defaultValue={lead?.installation_type ?? ''}
        placeholder="Ex: Residencial, Comercial"
      />

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Etapa do funil *</label>
        <select name="current_stage_id" defaultValue={lead?.current_stage_id ?? stages[0]?.id} style={selectStyle} required>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Responsável</label>
        <select name="assigned_to_user_id" defaultValue={lead?.assigned_to_user_id ?? ''} style={selectStyle}>
          <option value="">— Nenhum —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Origem do lead</label>
        <select name="lead_source_id" defaultValue={lead?.lead_source?.id ?? ''} style={selectStyle}>
          <option value="">— Nenhuma —</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Observações</label>
        <textarea
          name="observations"
          defaultValue={lead?.observations ?? ''}
          placeholder="Observações sobre o lead..."
          rows={3}
          style={{
            ...selectStyle,
            resize: 'vertical',
          }}
        />
      </div>

      <FormError message={state?.error} />

      <div className="flex gap-2 mt-2">
        <SubmitButton className="flex-1">
          {lead ? 'Salvar alterações' : 'Criar lead'}
        </SubmitButton>
      </div>
    </form>
  )
}

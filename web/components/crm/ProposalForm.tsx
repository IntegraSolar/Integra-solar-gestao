'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { CurrencyInput } from '@/components/ui/inputs'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { Button } from '@/components/ui/Button'
import { createProposal } from '@/lib/crm/actions'
import type { ActionResult } from '@/lib/crm/types'

interface ProposalFormProps {
  leadId: string
  suppliers?: any[]
  generationFactor: number
  onSuccess: () => void
  onCancel: () => void
}

export function ProposalForm({ leadId, generationFactor, onSuccess, onCancel }: ProposalFormProps) {
  const [panelQty, setPanelQty] = useState(0)
  const [panelPower, setPanelPower] = useState(0)
  const [inverterPowerKw, setInverterPowerKw] = useState(0)

  const systemKwp = (panelQty * panelPower) / 1000
  const monthlyGen = systemKwp * generationFactor

  const boundAction = createProposal.bind(null, leadId)
  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('total_power_kwp', systemKwp.toFixed(3))
      formData.set('monthly_generation_kwh', monthlyGen.toFixed(1))
      // converte kW → W antes de salvar
      formData.set('inverter_power_w', (inverterPowerKw * 1000).toString())
      const result = await boundAction(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    {} as ActionResult
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input name="name" label="Nome da proposta *" placeholder="Ex: Proposta Residencial 5kWp" required />
        </div>

        <Input
          name="panel_qty"
          label="Qtd. painéis"
          type="number"
          min="0"
          value={panelQty.toString()}
          onChange={(e) => setPanelQty(Number(e.target.value))}
        />
        <Input
          name="panel_power_w"
          label="Potência placa (W)"
          type="number"
          min="0"
          step="0.01"
          value={panelPower.toString()}
          onChange={(e) => setPanelPower(Number(e.target.value))}
        />
        <div className="col-span-2">
          <Input name="panel_brand_model" label="Marca/Modelo do painel" placeholder="Ex: Jinko 550W" />
        </div>

        <Input name="inverter_qty" label="Qtd. inversores" type="number" min="0" defaultValue="1" />
        <Input
          name="inverter_power_kw_display"
          label="Potência inversor (kW)"
          type="number"
          min="0"
          step="0.01"
          value={inverterPowerKw.toString()}
          onChange={(e) => setInverterPowerKw(Number(e.target.value))}
        />
        <div className="col-span-2">
          <Input name="inverter_brand_model" label="Marca/Modelo do inversor" placeholder="Ex: Growatt 5kW" />
        </div>

        <CurrencyInput name="kit_value" label="Valor do kit (R$)" value={null} />
        <Input name="km_rodados" label="Km rodados (ida e volta)" type="number" min="0" step="0.1" defaultValue="0" placeholder="Ex: 10" />
        <div className="col-span-2">
          <Input name="supplier_name" label="Fornecedor" placeholder="Ex: Aldo Solar" />
        </div>
      </div>

      <div
        className="rounded-xl p-4 grid grid-cols-2 gap-4"
        style={{ background: 'var(--theme-highlight-bg)', border: '1px solid var(--theme-highlight-border)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Potência do sistema</p>
          <p className="text-base font-semibold" style={{ color: 'var(--theme-accent)' }}>{systemKwp.toFixed(2)} kWp</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Geração média/mês</p>
          <p className="text-base font-semibold" style={{ color: 'var(--theme-accent)' }}>{Math.round(monthlyGen)} kWh</p>
        </div>
      </div>

      <FormError message={state?.error} />
      <div className="flex gap-3">
        <SubmitButton className="flex-1">Criar proposta</SubmitButton>
        <Button variant="ghost" className="text-xs" onClick={onCancel} type="button">
          Cancelar
        </Button>
      </div>
    </form>
  )
}

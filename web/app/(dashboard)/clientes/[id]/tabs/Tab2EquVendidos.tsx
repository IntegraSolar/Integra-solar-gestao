// web/app/(dashboard)/clientes/[id]/tabs/Tab2EquVendidos.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab2 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

const checkboxRow = (name: string, label: string, checked: boolean) => (
  <label className="flex items-center gap-2.5 cursor-pointer">
    <input
      type="checkbox"
      name={name}
      defaultChecked={checked}
      className="w-4 h-4 rounded cursor-pointer"
    />
    <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
  </label>
)

export function Tab2EquVendidos({ client }: { client: Client }) {
  const action = updateTab2.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="promised_kwh"
          label="kWh prometido/mês"
          type="number"
          step="0.01"
          defaultValue={client.promised_kwh?.toString() ?? ''}
          placeholder="Ex: 400"
        />
        <Input
          name="system_power_kwp"
          label="Potência do sistema (kWp)"
          type="number"
          step="0.01"
          defaultValue={client.system_power_kwp?.toString() ?? ''}
          placeholder="Ex: 5.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input name="panel_brand" label="Marca do painel" defaultValue={client.panel_brand ?? ''} placeholder="Ex: Jinko" />
        <Input
          name="panel_power_w"
          label="Potência placa (W)"
          type="number"
          step="0.01"
          defaultValue={client.panel_power_w?.toString() ?? ''}
          placeholder="Ex: 550"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input name="inverter_brand" label="Marca do inversor" defaultValue={client.inverter_brand ?? ''} placeholder="Ex: Growatt" />
        <Input
          name="inverter_power_w"
          label="Potência inversor (kW)"
          type="number"
          step="0.01"
          defaultValue={client.inverter_power_w?.toString() ?? ''}
          placeholder="Ex: 7.5"
        />
      </div>

      <Input
        name="inverter_extra_capacity"
        label="Capacidade extra do inversor (placas adicionais)"
        defaultValue={(client as any).inverter_extra_capacity ?? ''}
        placeholder="Ex: 8 placas ou 4.88 kWp"
      />

      <div
        className="flex flex-col gap-3 p-3 rounded-xl"
        style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
      >
        {checkboxRow('specific_panels', 'Painéis específicos (marca/modelo definido)', client.specific_panels)}
        {checkboxRow('specific_inverter', 'Inversor específico (marca/modelo definido)', client.specific_inverter)}
        {checkboxRow('direct_delivery', 'Entrega direta (cliente recebe o material)', client.direct_delivery)}
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Equipamentos</SubmitButton>
    </form>
  )
}

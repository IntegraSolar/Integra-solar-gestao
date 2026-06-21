// web/app/(dashboard)/clientes/[id]/tabs/Tab5Prazos.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/inputs'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab5 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

export function Tab5Prazos({ client }: { client: Client }) {
  const action = updateTab5.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <DatePicker
          name="contract_date"
          label="Data do contrato"
          value={client.contract_date ?? ''}
        />
        <Input
          name="contract_max_days"
          label="Prazo máximo (dias)"
          type="number"
          min="1"
          defaultValue={client.contract_max_days?.toString() ?? ''}
          placeholder="Ex: 45"
        />
      </div>
      <DatePicker
        name="delivery_start_date"
        label="Data de início do prazo"
        value={client.delivery_start_date ?? ''}
      />

      {client.contract_date && client.contract_max_days && (
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,200,100,0.06)', border: '1px solid rgba(255,200,100,0.15)' }}
        >
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Prazo de entrega calculado</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--theme-accent)' }}>
            {new Date(
              new Date(client.contract_date).getTime() + client.contract_max_days * 86400000
            ).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>}
      <SubmitButton className="self-start">Salvar Prazos</SubmitButton>
    </form>
  )
}

// web/app/(dashboard)/clientes/[id]/tabs/Tab1DadosPessoais.tsx
'use client'

import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { CpfCnpjInput, PhoneInput, CepInput } from '@/components/ui/inputs'
import { updateTab1 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'

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

export function Tab1DadosPessoais({ client }: { client: Client }) {
  const action = updateTab1.bind(null, client.id)
  const [state, formAction] = useFormState(action, {} as ActionResult)

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Tipo de pessoa</label>
        <select name="type" defaultValue={client.type ?? 'pf'} style={selectStyle}>
          <option value="pf">Pessoa Física</option>
          <option value="pj">Pessoa Jurídica</option>
        </select>
      </div>

      <Input name="name" label="Nome *" defaultValue={client.name} required />
      <CpfCnpjInput name="cpf_cnpj" label="CPF / CNPJ" value={client.cpf_cnpj ?? ''} />
      <Input name="email" label="Email" type="email" defaultValue={client.email ?? ''} />
      <PhoneInput name="phone" label="Telefone" value={client.phone ?? ''} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input name="street" label="Rua" defaultValue={client.street ?? ''} />
        </div>
        <Input name="number" label="Número" defaultValue={client.number ?? ''} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input name="neighborhood" label="Bairro" defaultValue={client.neighborhood ?? ''} />
        <CepInput name="zip" label="CEP" value={client.zip ?? ''} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input name="city" label="Cidade" defaultValue={client.city ?? ''} />
        <Input name="state" label="Estado" defaultValue={client.state ?? ''} placeholder="SP" />
      </div>

      <FormError message={state?.error} />
      {state?.success && (
        <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>
      )}
      <SubmitButton className="self-start">Salvar Dados Pessoais</SubmitButton>
    </form>
  )
}

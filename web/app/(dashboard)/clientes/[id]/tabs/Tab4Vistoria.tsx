// web/app/(dashboard)/clientes/[id]/tabs/Tab4Vistoria.tsx
'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormError } from '@/components/ui/FormError'
import { updateTab4 } from '@/lib/clients/actions'
import type { Client, ActionResult } from '@/lib/clients/types'
import { Plus, Trash2 } from 'lucide-react'

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

export function Tab4Vistoria({ client }: { client: Client }) {
  const action = updateTab4.bind(null, client.id)

  const existingAdaptations: string[] = (() => {
    try {
      const parsed = JSON.parse((client as any).adaptation_details ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })()

  const [hasAdaptation, setHasAdaptation] = useState(client.has_adaptation_works)
  const [adaptations, setAdaptations] = useState<string[]>(
    existingAdaptations.length > 0 ? existingAdaptations : ['']
  )

  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      if (hasAdaptation) {
        formData.set('adaptation_details', JSON.stringify(adaptations.filter((a) => a.trim())))
      } else {
        formData.set('adaptation_details', '[]')
      }
      if (hasAdaptation) formData.set('has_adaptation_works', 'on')
      return action(prev, formData)
    },
    {} as ActionResult
  )

  function addAdaptation() {
    setAdaptations((prev) => [...prev, ''])
  }

  function updateAdaptation(idx: number, value: string) {
    setAdaptations((prev) => prev.map((a, i) => (i === idx ? value : a)))
  }

  function removeAdaptation(idx: number) {
    setAdaptations((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="has_adaptation_works"
          checked={hasAdaptation}
          onChange={(e) => setHasAdaptation(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Possui obras de adaptação</span>
      </label>

      {hasAdaptation && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
        >
          <p style={labelStyle}>Adaptações necessárias</p>
          {adaptations.map((a, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={a}
                onChange={(e) => updateAdaptation(idx, e.target.value)}
                placeholder={`Adaptação ${idx + 1} — descreva aqui`}
                className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--theme-input-bg)',
                  border: '1px solid var(--theme-input-border)',
                  color: 'var(--theme-input-text)',
                }}
              />
              {adaptations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAdaptation(idx)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                >
                  <Trash2 size={14} style={{ color: 'rgba(255,80,80,0.5)' }} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addAdaptation}
            className="flex items-center gap-1.5 text-xs transition-colors hover:text-white/70"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <Plus size={13} /> Adicionar adaptação
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>Tipo de telhado</label>
          <select name="roof_type" defaultValue={client.roof_type ?? ''} style={selectStyle}>
            <option value="">— Selecione —</option>
            <option value="fibrocimento">Fibrocimento</option>
            <option value="ceramica">Cerâmica</option>
            <option value="metalica">Metálica</option>
            <option value="laje">Laje</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <Input name="roof_orientation" label="Orientação do telhado" defaultValue={client.roof_orientation ?? ''} placeholder="Ex: Norte" />
      </div>

      <Input name="maps_coordinates" label="Coordenadas Google Maps" defaultValue={client.maps_coordinates ?? ''} placeholder="-23.5505, -46.6333" />

      <div className="grid grid-cols-2 gap-3">
        <Input name="entry_breaker" label="Disjuntor de entrada" defaultValue={client.entry_breaker ?? ''} placeholder="Ex: 63A" />
        <Input name="entry_cable_mm" label="Cabo de entrada (mm²)" defaultValue={client.entry_cable_mm ?? ''} placeholder="Ex: 10mm²" />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" name="inspection_done" defaultChecked={client.inspection_done} className="w-4 h-4 rounded" />
        <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Vistoria realizada</span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Observações do cliente</label>
        <textarea name="client_notes" defaultValue={client.client_notes ?? ''} placeholder="Anotações da vistoria..." rows={3}
          style={{ ...selectStyle, resize: 'vertical' }} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Promessas extras</label>
        <textarea name="extra_promises" defaultValue={client.extra_promises ?? ''} placeholder="Combinados extras com o cliente..." rows={2}
          style={{ ...selectStyle, resize: 'vertical' }} />
      </div>

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm" style={{ color: '#10B981' }}>{state.success}</p>}
      <SubmitButton className="self-start">Salvar Vistoria</SubmitButton>
    </form>
  )
}

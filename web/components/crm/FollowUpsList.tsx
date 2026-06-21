'use client'

import { useState, useEffect, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/inputs'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { createFollowUp, toggleFollowUp } from '@/lib/crm/actions'
import type { ActionResult, Lead, LeadFollowUp } from '@/lib/crm/types'

export function FollowUpsList({ lead }: { lead: Lead }) {
  const [followups, setFollowups] = useState<LeadFollowUp[]>(lead.followups)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFollowups(lead.followups)
  }, [lead.followups])

  function refreshFollowups() {
    fetch(`/api/leads/${lead.id}/followups`)
      .then((r) => r.json())
      .then((data) => { if (data.followups) setFollowups(data.followups) })
  }

  const boundCreate = createFollowUp.bind(null, lead.id)
  const [state, formAction] = useFormState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await boundCreate(prev, formData)
      if (result.success) {
        setShowForm(false)
        refreshFollowups()
      }
      return result
    },
    {} as ActionResult
  )

  const pending = followups.filter((f) => !f.completed_at)
  const done = followups.filter((f) => !!f.completed_at)

  return (
    <div className="flex flex-col gap-4">
      {!showForm ? (
        <Button className="self-start text-xs py-1.5 px-4" onClick={() => setShowForm(true)}>
          + Agendar follow-up
        </Button>
      ) : (
        <form
          action={formAction}
          className="flex flex-col gap-3 p-3 rounded-xl"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)' }}
        >
          <Input name="title" label="Título *" placeholder="Ex: Ligar para o cliente" required />
          <Input name="description" label="Descrição" placeholder="Detalhes..." />
          <div className="grid grid-cols-2 gap-2">
            <DatePicker name="due_date" label="Data *" required />
            <Input name="due_time" label="Hora" type="time" defaultValue="09:00" />
          </div>
          <FormError message={state?.error} />
          <div className="flex gap-2">
            <SubmitButton className="flex-1 text-xs">Agendar</SubmitButton>
            <Button variant="ghost" className="text-xs" onClick={() => setShowForm(false)} type="button">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {pending.length === 0 && done.length === 0 && !showForm && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--theme-text-subtle)' }}>
          Nenhum follow-up agendado.
        </p>
      )}

      {pending.map((f) => (
        <div
          key={f.id}
          className="flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
        >
          <input
            type="checkbox"
            checked={false}
            onChange={() =>
              startTransition(async () => {
                await toggleFollowUp(f.id, true)
                refreshFollowups()
              })
            }
            className="mt-0.5 cursor-pointer"
            disabled={isPending}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{f.title}</p>
            {f.description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{f.description}</p>
            )}
            {f.due_date && (
              <p className="text-xs mt-1" style={{ color: 'var(--theme-accent)' }}>
                {new Date(f.due_date).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
            Concluídos
          </p>
          {done.map((f) => (
            <div
              key={f.id}
              className="flex items-start gap-3 p-3 rounded-xl opacity-50"
              style={{ background: 'var(--theme-surface)' }}
            >
              <input
                type="checkbox"
                checked={true}
                onChange={() =>
                  startTransition(async () => {
                    await toggleFollowUp(f.id, false)
                    refreshFollowups()
                  })
                }
                className="mt-0.5 cursor-pointer"
              />
              <p className="text-sm line-through" style={{ color: 'var(--theme-text-muted)' }}>{f.title}</p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

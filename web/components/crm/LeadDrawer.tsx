'use client'

import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { LeadForm } from './LeadForm'
import { NotesList } from './NotesList'
import { FollowUpsList } from './FollowUpsList'
import { ProposalsList } from './ProposalsList'
import { deleteLead, convertLeadToClient } from '@/lib/crm/actions'
import type { Lead, FunnelStage, LeadSource, LeadUser } from '@/lib/crm/types'

type Tab = 'dados' | 'notas' | 'followups' | 'propostas'

interface LeadDrawerProps {
  lead: Lead | null
  isNew: boolean
  stages: FunnelStage[]
  sources: LeadSource[]
  members: LeadUser[]
  onClose: () => void
  onSaved?: () => void
}

export function LeadDrawer({ lead, isNew, stages, sources, members, onClose, onSaved }: LeadDrawerProps) {
  const [tab, setTab] = useState<Tab>('dados')
  const [converting, setConverting] = useState(false)

  const isOpen = !!lead || isNew
  const title = isNew ? 'Novo Lead' : (lead?.name ?? '')

  async function handleDelete() {
    if (!lead) return
    if (!confirm(`Excluir "${lead.name}"?`)) return
    await deleteLead(lead.id)
    onClose()
  }

  async function handleConvert() {
    if (!lead) return
    setConverting(true)
    await convertLeadToClient(lead.id)
    setConverting(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados', label: 'Dados' },
    { key: 'notas', label: 'Notas' },
    { key: 'followups', label: 'Follow-ups' },
    { key: 'propostas', label: 'Propostas' },
  ]

  return (
    <Drawer open={isOpen} onClose={onClose} title={title} width="clamp(480px, 65vw, 1000px)">
      {!isNew && lead && (
        <>
          {/* Header actions — Converter + Excluir */}
          <div
            className="flex items-center justify-end gap-2 -mt-2 mb-3 -mx-5 px-5 pb-3"
            style={{ borderBottom: '1px solid var(--theme-border)' }}
          >
            {!lead.converted && (
              <Button
                className="text-xs py-1.5 px-4"
                onClick={handleConvert}
                loading={converting}
              >
                {converting ? 'Convertendo...' : 'Converter em Cliente'}
              </Button>
            )}
            <button
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--theme-danger)' }}
              onClick={handleDelete}
            >
              Excluir
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-1 mb-5 -mx-5 px-5 pb-3"
            style={{ borderBottom: '1px solid var(--theme-border)' }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  tab === t.key
                    ? { background: 'rgba(255,200,100,0.12)', color: 'var(--theme-accent)' }
                    : { color: 'var(--theme-text-muted)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'dados' && (
            <LeadForm
              lead={lead}
              stages={stages}
              sources={sources}
              members={members}
              onSuccess={onSaved ?? onClose}
            />
          )}

          {tab === 'notas' && <NotesList lead={lead} />}
          {tab === 'followups' && <FollowUpsList lead={lead} />}
          {tab === 'propostas' && <ProposalsList lead={lead} />}
        </>
      )}

      {isNew && (
        <LeadForm
          stages={stages}
          sources={sources}
          members={members}
          onSuccess={onSaved ?? onClose}
        />
      )}
    </Drawer>
  )
}

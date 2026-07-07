// web/app/(dashboard)/leads/LeadsClient.tsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type { Lead, FunnelStage, LeadSource, LeadUser } from '@/lib/crm/types'
import dynamic from 'next/dynamic'
import { LeadsTable } from '@/components/crm/LeadsTable'
import { LeadDrawer } from '@/components/crm/LeadDrawer'

const KanbanBoard = dynamic(
  () => import('@/components/crm/KanbanBoard').then(m => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        Carregando Kanban...
      </div>
    ),
  }
)
import { Button } from '@/components/ui/Button'
import { SearchBar, filterBySearch } from '@/components/ui/SearchBar'

interface LeadsClientProps {
  initialLeads: Lead[]
  stages: FunnelStage[]
  sources: LeadSource[]
  members: LeadUser[]
}

export function LeadsClient({ initialLeads, stages, sources, members }: LeadsClientProps) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [search, setSearch] = useState('')
  const filteredLeads = useMemo(
    () => filterBySearch(leads, search, ['name', 'phone', 'city']),
    [leads, search]
  )

  const refreshLeads = useCallback(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => { if (data.leads) setLeads(data.leads) })
  }, [])

  const handleDrawerClose = useCallback(() => {
    setSelectedLead(null)
    setCreatingNew(false)
  }, [])

  const handleLeadSaved = useCallback(() => {
    setSelectedLead(null)
    setCreatingNew(false)
    refreshLeads()
  }, [refreshLeads])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        {/* Toggle kanban/list */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--theme-input-border)' }}
        >
          {(['kanban', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={
                view === v
                  ? { background: 'rgba(255,200,100,0.15)', color: 'var(--theme-accent)' }
                  : { color: 'var(--theme-text-muted)' }
              }
            >
              {v === 'kanban' ? '⊞ Kanban' : '☰ Lista'}
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Buscar lead..." />

        <div className="flex-1" />

        <Link href="/leads/configurar-funil">
          <Button variant="secondary" className="text-xs py-1.5 px-3">
            ⚙ Configurar funil
          </Button>
        </Link>

        <Button
          className="text-xs py-1.5 px-3"
          onClick={() => setCreatingNew(true)}
        >
          + Novo Lead
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <KanbanBoard
            leads={filteredLeads}
            stages={stages}
            onLeadClick={setSelectedLead}
          />
        ) : (
          <LeadsTable
            leads={filteredLeads}
            onLeadClick={setSelectedLead}
          />
        )}
      </div>

      {/* Lead drawer */}
      <LeadDrawer
        lead={selectedLead}
        isNew={creatingNew}
        stages={stages}
        sources={sources}
        members={members}
        onClose={handleDrawerClose}
        onSaved={handleLeadSaved}
      />
    </div>
  )
}

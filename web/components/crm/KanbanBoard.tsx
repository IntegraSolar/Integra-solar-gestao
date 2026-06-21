'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { Lead, FunnelStage } from '@/lib/crm/types'
import { KanbanColumn } from './KanbanColumn'
import { moveLeadStage } from '@/lib/crm/actions'

interface KanbanBoardProps {
  leads: Lead[]
  stages: FunnelStage[]
  onLeadClick: (lead: Lead) => void
}

export function KanbanBoard({ leads: externalLeads, stages, onLeadClick }: KanbanBoardProps) {
  const [leads, setLeads] = useState(externalLeads)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    if (!isDragging.current) {
      setLeads(externalLeads)
    }
  }, [externalLeads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getLeadsForStage(stageId: string) {
    return leads.filter((l) => l.current_stage_id === stageId)
  }

  function handleDragStart({ active }: DragStartEvent) {
    isDragging.current = true
    setActiveLead(leads.find((l) => l.id === String(active.id)) ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const overId = over.id as string
    const overStage = stages.find((s) => s.id === overId)
    const overLead = leads.find((l) => l.id === overId)
    const targetStageId = overStage?.id ?? overLead?.current_stage_id

    if (!targetStageId) return
    const activeId = active.id as string
    setLeads((prev) =>
      prev.map((l) => (l.id === activeId ? { ...l, current_stage_id: targetStageId } : l))
    )
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    isDragging.current = false
    setActiveLead(null)
    if (!over) return
    const overId = over.id as string
    const overStage = stages.find((s) => s.id === overId)
    const overLead = leads.find((l) => l.id === overId)
    const targetStageId = overStage?.id ?? overLead?.current_stage_id
    if (!targetStageId) return
    await moveLeadStage(active.id as string, targetStageId)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto h-full p-6 pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={getLeadsForStage(stage.id)}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <div
            className="rounded-xl p-3 w-60 rotate-2"
            style={{
              background: 'rgba(15,30,55,0.97)',
              border: '1px solid rgba(255,200,100,0.30)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              {activeLead.name}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

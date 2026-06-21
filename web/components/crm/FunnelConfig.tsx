'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import {
  createFunnelStage,
  updateFunnelStage,
  deleteFunnelStage,
  reorderFunnelStages,
} from '@/lib/crm/actions'
import type { FunnelStage } from '@/lib/crm/types'

const COLORS = ['#6B7A90', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#14B8A6']

function StageRow({ stage, stages, onUpdate }: { stage: FunnelStage; stages: FunnelStage[]; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color)
  const [isPending, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  function save() {
    startTransition(async () => {
      await updateFunnelStage(stage.id, { name, color })
      setEditing(false)
      onUpdate()
    })
  }

  function handleDelete() {
    const others = stages.filter((s) => s.id !== stage.id)
    if (others.length === 0) { alert('Não é possível excluir a única etapa.'); return }
    const moveTo = others[0].id
    if (!confirm(`Excluir "${stage.name}"? Os leads serão movidos para "${others[0].name}".`)) return
    startTransition(async () => {
      await deleteFunnelStage(stage.id, moveTo)
      onUpdate()
    })
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-card-border)',
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-sm flex-shrink-0"
          style={{ color: 'var(--theme-text-subtle)' }}
        >
          ⠿
        </span>

        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: stage.color }}
        />

        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--theme-input-text)' }}
            />
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <Button className="text-xs py-1 px-2" onClick={save} loading={isPending} type="button">Salvar</Button>
            <Button variant="ghost" className="text-xs py-1 px-2" onClick={() => setEditing(false)} type="button">×</Button>
          </div>
        ) : (
          <span className="flex-1 text-sm" style={{ color: 'var(--theme-text)' }}>{stage.name}</span>
        )}

        {!editing && (
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => setEditing(true)} className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>editar</button>
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-xs" style={{ color: 'rgba(255,80,80,0.50)' }}>excluir</button>
          </div>
        )}
      </div>
    </div>
  )
}

export function FunnelConfig({ initialStages }: { initialStages: FunnelStage[] }) {
  const [stages, setStages] = useState(initialStages)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [version, setVersion] = useState(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function refresh() { setVersion((v) => v + 1) }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIdx = stages.findIndex((s) => s.id === active.id)
    const newIdx = stages.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(stages, oldIdx, newIdx).map((s, i) => ({ ...s, order: i + 1 }))
    setStages(reordered)
    startTransition(async () => {
      await reorderFunnelStages(reordered.map((s) => ({ id: s.id, order: s.order })))
    })
  }

  function addStage() {
    if (!newName.trim()) return
    startTransition(async () => {
      await createFunnelStage(newName.trim(), stages.length + 1)
      setNewName('')
      refresh()
    })
  }

  return (
    <div className="max-w-lg">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {stages.map((stage) => (
            <StageRow key={`${stage.id}-${version}`} stage={stage} stages={stages} onUpdate={refresh} />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da nova etapa..."
          onKeyDown={(e) => e.key === 'Enter' && addStage()}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
          style={{
            background: 'var(--theme-input-bg)',
            border: '1px solid var(--theme-input-border)',
            color: 'var(--theme-input-text)',
          }}
        />
        <Button className="text-xs px-4" onClick={addStage} loading={isPending} type="button">
          + Adicionar
        </Button>
      </div>
    </div>
  )
}

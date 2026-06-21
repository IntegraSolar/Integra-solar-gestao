'use client'

import { useTransition } from 'react'
import { X, Check, Clock, AlertTriangle, Calendar } from 'lucide-react'
import { toggleFollowUp } from '@/lib/crm/actions'
import type { FollowUpNotification } from '@/hooks/useFollowUpNotifications'

type GroupedFollowUps = {
  overdue: FollowUpNotification[]
  today: FollowUpNotification[]
  upcoming: FollowUpNotification[]
}

interface NotificationsDrawerProps {
  isOpen: boolean
  onClose: () => void
  grouped: GroupedFollowUps
  onLeadClick: (leadId: string) => void
  onCompleted: () => void
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FollowUpItem({
  item,
  color,
  onLeadClick,
  onCompleted,
}: {
  item: FollowUpNotification
  color: string
  onLeadClick: (leadId: string) => void
  onCompleted: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    startTransition(async () => {
      await toggleFollowUp(item.id, true)
      onCompleted()
    })
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl transition-colors"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
          {item.title}
        </p>
        <button
          onClick={() => onLeadClick(item.lead_id)}
          className="text-xs mt-0.5 hover:underline"
          style={{ color: 'var(--theme-accent)' }}
        >
          {item.lead_name}
        </button>
        {item.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-subtle)' }}>
            {item.description}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-subtle)' }}>
          {formatDateTime(item.due_date)}
        </p>
      </div>
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="p-1.5 rounded-lg transition-colors hover:bg-white/10 flex-shrink-0"
        title="Marcar como concluído"
      >
        <Check size={14} style={{ color: isPending ? 'var(--theme-text-subtle)' : 'var(--theme-text-muted)' }} />
      </button>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  color,
  items,
  onLeadClick,
  onCompleted,
}: {
  title: string
  icon: React.ElementType
  color: string
  items: FollowUpNotification[]
  onLeadClick: (leadId: string) => void
  onCompleted: () => void
}) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon size={13} style={{ color }} />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
          {title} ({items.length})
        </p>
      </div>
      {items.map((item) => (
        <FollowUpItem
          key={item.id}
          item={item}
          color={color}
          onLeadClick={onLeadClick}
          onCompleted={onCompleted}
        />
      ))}
    </div>
  )
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  grouped,
  onLeadClick,
  onCompleted,
}: NotificationsDrawerProps) {
  if (!isOpen) return null

  const totalCount = grouped.overdue.length + grouped.today.length + grouped.upcoming.length

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'var(--theme-overlay)' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 w-[380px] z-[61] flex flex-col"
        style={{
          background: 'var(--theme-drawer-bg)',
          borderLeft: '1px solid var(--theme-card-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="h-14 flex items-center justify-between px-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <h2 className="text-sm font-bold text-white">Follow-ups Pendentes</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
          >
            <X size={16} style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {totalCount === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--theme-text-subtle)' }}>
              Nenhum follow-up pendente.
            </p>
          ) : (
            <>
              <Section
                title="Atrasados"
                icon={AlertTriangle}
                color="#EF4444"
                items={grouped.overdue}
                onLeadClick={onLeadClick}
                onCompleted={onCompleted}
              />
              <Section
                title="Hoje"
                icon={Clock}
                color="#FFD080"
                items={grouped.today}
                onLeadClick={onLeadClick}
                onCompleted={onCompleted}
              />
              <Section
                title="Próximos 7 dias"
                icon={Calendar}
                color="var(--theme-text-muted)"
                items={grouped.upcoming}
                onLeadClick={onLeadClick}
                onCompleted={onCompleted}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

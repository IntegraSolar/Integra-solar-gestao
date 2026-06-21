'use client'

import { Bell } from 'lucide-react'

interface NotificationBellProps {
  count: number
  onClick: () => void
}

export function NotificationBell({ count, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-1.5 rounded-lg transition-colors hover:bg-white/10"
      title={count > 0 ? `${count} follow-up(s) pendente(s)` : 'Sem follow-ups pendentes'}
    >
      <Bell
        size={18}
        style={{ color: count > 0 ? 'var(--theme-accent)' : 'var(--theme-text-subtle)' }}
      />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
          style={{ background: 'var(--theme-danger)' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

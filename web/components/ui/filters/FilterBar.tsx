'use client'

import { useState, type ReactNode } from 'react'

interface FilterBarProps {
  children: ReactNode              // Filtros sempre visíveis (busca + 1-2 principais)
  advanced?: ReactNode             // Filtros dentro do painel "Mais filtros"
  activeCount?: number             // Número de filtros ativos (para badge)
  onClear?: () => void             // Chamado ao clicar em "Limpar filtros"
}

export function FilterBar({ children, advanced, activeCount = 0, onClear }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {children}
        {advanced && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              background: 'var(--theme-surface)',
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {expanded ? 'Ocultar filtros' : 'Mais filtros'}
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold min-w-[16px] h-4"
                style={{ background: 'var(--theme-primary, #10B981)', color: '#fff' }}>
                {activeCount}
              </span>
            )}
          </button>
        )}
        {activeCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold transition-colors hover:underline"
            style={{ color: 'var(--theme-text-subtle)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {advanced && expanded && (
        <div
          className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          style={{
            background: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
          }}
        >
          {advanced}
        </div>
      )}
    </div>
  )
}

interface FilterFieldProps {
  label: string
  children: ReactNode
}

export function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

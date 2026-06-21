// web/components/ui/Drawer.tsx
'use client'

import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: number | string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, width = '50vw', children }: DrawerProps) {
  // Fechar com ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'var(--theme-overlay)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width,
          background: 'var(--theme-drawer-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--theme-card-border)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          {title && (
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--theme-text-subtle)' }}
          >
            ✕
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}

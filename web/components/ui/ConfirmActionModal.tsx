'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Modal de confirmação para operações destrutivas irreversíveis.
 * Exige que o usuário digite a `phrase` exata para habilitar o botão de confirmar.
 */
export function ConfirmActionModal({
  open,
  title,
  description,
  phrase,
  phrasePlaceholder,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  /** Texto que o usuário deve digitar exatamente para confirmar */
  phrase: string
  phrasePlaceholder?: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTyped('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const confirmed = typed === phrase

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl"
        style={{ background: 'var(--theme-surface)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-white/60 leading-relaxed">{description}</p>

        {/* Confirmation input */}
        <div className="space-y-2">
          <p className="text-xs text-white/40">
            Digite <span className="font-mono font-semibold text-white/70">{phrase}</span> para confirmar:
          </p>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && confirmed) onConfirm() }}
            placeholder={phrasePlaceholder ?? phrase}
            className="w-full rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none transition-colors"
            style={{
              background: 'var(--theme-input-bg, rgba(255,255,255,0.05))',
              border: typed.length > 0
                ? confirmed ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)'
                : '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={confirmed
              ? { background: 'rgba(239,68,68,0.85)', color: 'white' }
              : { background: 'rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.5)' }}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

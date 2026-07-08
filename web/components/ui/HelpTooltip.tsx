'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  /** Texto de ajuda que aparece no tooltip. */
  content: string
  /** Tamanho do ícone em px. Padrão: 14. */
  size?: number
  /** Posição preferida. Padrão: 'top'. */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Rótulo acessível — se omitido, usa "Ajuda". */
  ariaLabel?: string
}

/**
 * Ícone circular "?" que exibe um tooltip explicativo ao passar o mouse.
 * Use ao lado de títulos de coluna, siglas ou termos técnicos.
 *
 * Exemplo: <HelpTooltip content="Cliente aguardando aprovação de crédito" />
 */
export function HelpTooltip({ content, size = 14, position = 'top', ariaLabel = 'Ajuda' }: Props) {
  const [visible, setVisible] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  // Fechar em ESC (para acessibilidade quando aberto via foco)
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible])

  const positionClasses: Record<string, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  const arrowClasses: Record<string, string> = {
    top:    'top-full left-1/2 -translate-x-1/2 border-t-[6px] border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[6px] border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent',
    left:   'left-full top-1/2 -translate-y-1/2 border-l-[6px] border-t-[5px] border-b-[5px] border-t-transparent border-b-transparent',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-[6px] border-t-[5px] border-b-[5px] border-t-transparent border-b-transparent',
  }

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex items-center align-middle ml-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={(e) => { e.preventDefault(); setVisible((v) => !v) }}
        className="inline-flex items-center justify-center rounded-full transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          width: size, height: size,
          background: 'rgba(107, 140, 164, 0.15)',
          color: 'var(--theme-text-subtle, #6B8CA4)',
          fontSize: Math.max(9, size - 5),
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ?
      </button>

      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 whitespace-normal rounded-lg px-2.5 py-1.5 text-xs font-normal shadow-lg pointer-events-none ${positionClasses[position]}`}
          style={{
            background: '#0E2236',
            color: '#fff',
            minWidth: 180,
            maxWidth: 280,
            lineHeight: 1.4,
          }}
        >
          {content}
          <span
            className={`absolute w-0 h-0 ${arrowClasses[position]}`}
            style={{ borderTopColor: position === 'top' ? '#0E2236' : undefined,
                     borderBottomColor: position === 'bottom' ? '#0E2236' : undefined,
                     borderLeftColor: position === 'left' ? '#0E2236' : undefined,
                     borderRightColor: position === 'right' ? '#0E2236' : undefined }}
          />
        </span>
      )}
    </span>
  )
}

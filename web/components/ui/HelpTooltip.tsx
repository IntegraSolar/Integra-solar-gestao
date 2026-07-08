'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

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
 * Ícone circular "?" com tooltip explicativo ao passar o mouse.
 * Usa React Portal para não ser cortado por containers com overflow: hidden.
 */
export function HelpTooltip({ content, size = 14, position = 'top', ariaLabel = 'Ajuda' }: Props) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Só habilita portal após montar (evita SSR mismatch)
  useEffect(() => { setMounted(true) }, [])

  // Fecha em ESC
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible])

  // Calcula posição sempre que ficar visível
  useLayoutEffect(() => {
    if (!visible || !buttonRef.current) return
    const btn = buttonRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current?.getBoundingClientRect()
    const gap = 8
    const tw = tooltip?.width ?? 240
    const th = tooltip?.height ?? 40

    let top = 0
    let left = 0
    switch (position) {
      case 'top':
        top = btn.top - th - gap
        left = btn.left + btn.width / 2 - tw / 2
        break
      case 'bottom':
        top = btn.bottom + gap
        left = btn.left + btn.width / 2 - tw / 2
        break
      case 'left':
        top = btn.top + btn.height / 2 - th / 2
        left = btn.left - tw - gap
        break
      case 'right':
        top = btn.top + btn.height / 2 - th / 2
        left = btn.right + gap
        break
    }

    // Clamp na viewport (padding de 8px)
    const vw = window.innerWidth
    if (left < 8) left = 8
    if (left + tw > vw - 8) left = vw - 8 - tw
    if (top < 8) top = 8

    setCoords({ top, left })
  }, [visible, position, content])

  const tooltipEl = visible && coords && mounted ? (
    createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        className="fixed z-[9999] rounded-lg px-3 py-2 text-xs font-normal shadow-lg pointer-events-none"
        style={{
          top: coords.top,
          left: coords.left,
          background: 'var(--theme-surface, #ffffff)',
          color: 'var(--theme-text, #1A2B3C)',
          border: '1px solid var(--theme-border, #E2ECF4)',
          minWidth: 180,
          maxWidth: 280,
          lineHeight: 1.5,
          whiteSpace: 'normal',
          boxShadow: '0 8px 24px rgba(10, 22, 34, 0.18)',
        }}
      >
        {content}
      </div>,
      document.body
    )
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={(e) => { e.preventDefault(); setVisible((v) => !v) }}
        className="inline-flex items-center justify-center align-middle rounded-full transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-offset-1 ml-1"
        style={{
          width: size, height: size,
          background: 'rgba(107, 140, 164, 0.18)',
          color: 'var(--theme-text-subtle, #6B8CA4)',
          fontSize: Math.max(9, size - 5),
          fontWeight: 700,
          lineHeight: 1,
          verticalAlign: 'middle',
        }}
      >
        ?
      </button>
      {tooltipEl}
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'

const THEMES = [
  {
    key: 'navy',
    label: 'Navy',
    description: 'Tema escuro com tons de azul marinho',
    preview: 'linear-gradient(135deg, #0A1628, #1A3A5C)',
    accent: '#FFD080',
  },
  {
    key: 'green',
    label: 'Green',
    description: 'Tema claro com tons de verde',
    preview: 'linear-gradient(135deg, #f5f4f3, #dcfce7)',
    accent: '#28944a',
  },
] as const

type ThemeKey = typeof THEMES[number]['key']

export default function AparenciaTab() {
  const [current, setCurrent] = useState<ThemeKey>('navy')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'green') setCurrent('green')
  }, [])

  function apply(key: ThemeKey) {
    setCurrent(key)
    if (key === 'navy') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('theme')
    } else {
      document.documentElement.setAttribute('data-theme', key)
      localStorage.setItem('theme', key)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Aparência</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
          Escolha o tema visual da plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        {THEMES.map((t) => {
          const selected = current === t.key
          return (
            <button
              key={t.key}
              onClick={() => apply(t.key)}
              className="rounded-2xl p-1 transition-all text-left"
              style={{
                border: selected
                  ? `2px solid ${t.accent}`
                  : '2px solid var(--theme-border)',
                background: 'var(--theme-surface)',
              }}
            >
              {/* Preview swatch */}
              <div
                className="h-20 rounded-xl mb-3"
                style={{ background: t.preview }}
              />
              <div className="px-2 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: t.accent }}
                  />
                  <span className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
                    {t.label}
                  </span>
                  {selected && (
                    <span
                      className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: t.accent, color: t.key === 'navy' ? '#0a0e1a' : '#fff' }}
                    >
                      ATIVO
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                  {t.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

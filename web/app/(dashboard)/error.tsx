'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Loga apenas mensagem e digest — sem stack trace em produção
    console.error('[DashboardError]', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
      >
        <AlertTriangle size={24} style={{ color: 'var(--theme-danger)' }} />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
          Algo deu errado
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--theme-text-subtle)' }}>
          {error.message || 'Erro inesperado ao carregar esta página.'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono mt-2" style={{ color: 'var(--theme-text-muted)' }}>
            ID: {error.digest}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ background: 'var(--theme-accent)', color: '#000' }}
      >
        <RefreshCw size={14} />
        Tentar novamente
      </button>
    </div>
  )
}

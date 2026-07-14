'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Error boundary de último recurso. Substitui o layout raiz quando um erro
 * ocorre nele próprio, então precisa renderizar <html>/<body> e não pode
 * depender do CSS global da aplicação. Reporta ao Sentry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', background: '#0E2236', color: '#fff', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 20, textAlign: 'center', padding: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚠️</div>
          <div>
            <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Algo deu errado</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', maxWidth: 380, margin: '0 auto' }}>
              Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
                ID: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            style={{ background: '#F59E0B', color: '#0E2236', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}

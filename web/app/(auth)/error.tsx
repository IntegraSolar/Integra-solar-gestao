'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function AuthError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">⚠️</div>
      <div>
        <h1 className="text-lg font-bold text-white">Algo deu errado</h1>
        <p className="mt-1 max-w-sm text-sm text-white/70">
          Não foi possível carregar esta página. Tente novamente.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-white/40">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-xl bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0E2236] transition-colors hover:bg-[#D97706] hover:text-white"
      >
        Tentar novamente
      </button>
    </div>
  )
}

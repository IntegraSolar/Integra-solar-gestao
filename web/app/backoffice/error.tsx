'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function BackofficeError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F8FB] px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-2xl">⚠️</div>
      <div>
        <h1 className="text-lg font-bold text-[#0E1B2A]">Algo deu errado</h1>
        <p className="mt-1 max-w-sm text-sm text-[#7C8D9E]">
          {error.message || 'Erro inesperado ao carregar esta página do backoffice.'}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[#9BAEBF]">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-xl bg-[#1A3A5C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0E2236]"
      >
        Tentar novamente
      </button>
    </div>
  )
}

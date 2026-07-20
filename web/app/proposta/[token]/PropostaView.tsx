'use client'

import { useState, useEffect, use } from 'react'
import { Apresentacao } from '@/components/apresentacao/Apresentacao'
// Tipo vem da fonte da verdade: se o backend mudar um campo, o build acusa aqui.
import type { ApresentacaoData, ApresentacaoConfig } from '@/lib/apresentacoes/tipos'

type Resposta = { dados: ApresentacaoData; config: ApresentacaoConfig }

export default function PropostaView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [data, setData] = useState<Resposta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/proposta/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Link inválido')
        return r.json()
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Carregando sua proposta...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">{error ?? 'Este link não existe ou foi invalidado.'}</p>
        </div>
      </div>
    )
  }

  return <Apresentacao dados={data.dados} config={data.config} />
}

// web/app/proposta-usina/[token]/PropostaUsinaView.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { ApresentacaoUsina } from '@/components/apresentacao-usina/ApresentacaoUsina'
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'

export default function PropostaUsinaView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [dados, setDados] = useState<ApresentacaoUsinaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/proposta-usina/${token}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Link inválido'); return r.json() })
      .then((d) => { setDados(d.dados); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [token])
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-gray-500">Carregando sua proposta...</p></div>
  if (error || !dados) return <div className="min-h-screen flex items-center justify-center p-6"><div className="text-center"><div className="text-4xl mb-3">🔒</div><p className="text-sm text-gray-500">{error ?? 'Link inválido.'}</p></div></div>
  return <ApresentacaoUsina dados={dados} token={token} />
}

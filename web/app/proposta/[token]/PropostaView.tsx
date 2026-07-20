'use client'

import { useState, useEffect, use } from 'react'

type PropostaData = {
  titulo: string
  empresa: { nome: string; cnpj: string | null; telefone: string | null; logo_url: string | null }
  cliente: { nome: string; cidade: string | null }
  sistema: {
    paineis: string
    inversores: string
    potencia_kwp: string
    geracao_mensal: string
  }
  investimento: { valor: string }
  datas: { emitida_em: string; valida_ate: string }
  tema: { cor_principal: string; cor_secundaria: string }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3 py-1">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right font-medium">{value}</span>
    </div>
  )
}

export default function PropostaView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [data, setData] = useState<PropostaData | null>(null)
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

  const { titulo, empresa, cliente, sistema, investimento, datas, tema } = data

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <div
        className="px-4 py-6 print:py-4"
        style={{ background: tema.cor_secundaria }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {empresa.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nome} className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {empresa.nome.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/70">{empresa.nome}</p>
            <h1 className="text-base font-semibold text-white truncate">{titulo}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 print:space-y-3 print:py-3">
        {/* Preparada para */}
        <Card title="Preparada para">
          <p className="text-base font-semibold text-gray-800">{cliente.nome}</p>
          {cliente.cidade && <p className="text-sm text-gray-500 mt-0.5">{cliente.cidade}</p>}
        </Card>

        {/* Sistema proposto */}
        <Card title="Sistema Proposto">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center mb-3 print:bg-white print:border print:border-gray-200">
            <p className="text-xs text-gray-500">Potência total</p>
            <p className="text-xl font-bold text-gray-800">{sistema.potencia_kwp}</p>
          </div>
          <InfoRow label="Painéis" value={sistema.paineis} />
          <InfoRow label="Inversores" value={sistema.inversores} />
          <InfoRow label="Geração estimada" value={sistema.geracao_mensal} />
        </Card>

        {/* Investimento */}
        <Card title="Investimento">
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">Valor do investimento</p>
            <p className="text-3xl font-bold" style={{ color: tema.cor_principal }}>
              {investimento.valor}
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center py-4 print:py-2 space-y-1">
          <p className="text-xs text-gray-400">
            Emitida em {datas.emitida_em} · válida até {datas.valida_ate}
          </p>
          {empresa.telefone && (
            <p className="text-xs text-gray-400">{empresa.telefone}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{empresa.nome}</p>
        </div>
      </div>
    </div>
  )
}

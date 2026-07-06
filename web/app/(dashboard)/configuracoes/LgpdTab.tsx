'use client'

import { useState, useTransition } from 'react'
import { searchForLgpd, anonymizeLead, anonymizeClient } from '@/lib/lgpd/actions'
import type { LgpdSearchResult } from '@/lib/lgpd/actions'

export default function LgpdTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LgpdSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2) return
    startTransition(async () => {
      const res = await searchForLgpd(query)
      setResults(res)
      setSearched(true)
      setFeedback(null)
    })
  }

  function handleAnonymize(item: LgpdSearchResult) {
    setConfirmId(item.id)
  }

  function confirmAnonymize(item: LgpdSearchResult) {
    setConfirmId(null)
    startTransition(async () => {
      const result =
        item.type === 'lead'
          ? await anonymizeLead(item.id)
          : await anonymizeClient(item.id)

      setFeedback({
        id: item.id,
        msg: result.error ?? result.success ?? '',
        ok: !result.error,
      })

      if (!result.error) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === item.id ? { ...r, name: '[Titular Removido]', phone: '[removido]' } : r
          )
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Aviso LGPD */}
      <div
        className="rounded-2xl border border-yellow-500/20 p-5"
        style={{ background: 'rgba(234,179,8,0.06)' }}
      >
        <h2 className="text-base font-semibold text-yellow-400 mb-1">
          Direito de Exclusão — LGPD
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Quando um titular solicitar a exclusão ou anonimização dos seus dados pessoais, use esta
          ferramenta para localizar e remover as informações identificáveis. Os dados financeiros e
          histórico operacional são mantidos para fins legais e fiscais, conforme permitido pela LGPD
          (Art. 16).
        </p>
      </div>

      {/* Busca */}
      <div
        className="rounded-2xl border border-white/10 p-5 space-y-4"
        style={{ background: 'var(--theme-surface)' }}
      >
        <h3 className="text-sm font-semibold text-white">Localizar titular</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome do lead ou cliente..."
            minLength={2}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 outline-none focus:border-white/30"
            style={{ background: 'var(--theme-input-bg)' }}
          />
          <button
            type="submit"
            disabled={isPending || query.trim().length < 2}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            {isPending ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Resultados */}
        {searched && results.length === 0 && (
          <p className="text-white/40 text-sm">Nenhum registro encontrado.</p>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Nome</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Tipo</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Telefone</th>
                  <th className="text-left py-2 text-white/50 font-medium">Cadastro</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.map((item) => {
                  const isAnonymized = item.name === '[Titular Removido]'
                  return (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-2.5 pr-4 text-white">{item.name}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background:
                              item.type === 'lead'
                                ? 'rgba(59,130,246,0.15)'
                                : 'rgba(16,185,129,0.15)',
                            color: item.type === 'lead' ? '#60a5fa' : '#34d399',
                          }}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-white/60">{item.phone ?? '—'}</td>
                      <td className="py-2.5 text-white/50 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2.5 text-right">
                        {confirmId === item.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-yellow-400">Confirmar?</span>
                            <button
                              onClick={() => confirmAnonymize(item)}
                              disabled={isPending}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                            >
                              Sim, anonimizar
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 text-white/50 hover:text-white transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : feedback?.id === item.id ? (
                          <span
                            className={`text-xs ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {feedback.msg}
                          </span>
                        ) : isAnonymized ? (
                          <span className="text-xs text-white/30 italic">Já anonimizado</span>
                        ) : (
                          <button
                            onClick={() => handleAnonymize(item)}
                            disabled={isPending}
                            className="px-3 py-1 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          >
                            Anonimizar dados
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota sobre arquivos */}
      <p className="text-white/30 text-xs">
        Arquivos físicos (contratos, documentos) enviados ao storage devem ser removidos manualmente
        pelo painel do Supabase Storage em caso de solicitação de exclusão completa.
      </p>
    </div>
  )
}

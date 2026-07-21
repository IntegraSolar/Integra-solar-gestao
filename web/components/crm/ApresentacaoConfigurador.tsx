'use client'

import { useState } from 'react'
import { TEMPLATES, blocosDoTemplate } from '@/lib/apresentacoes/templates'
import { TEMAS } from '@/lib/apresentacoes/temas'
import { BLOCOS_VALIDOS, ROTULOS_BLOCO, type BlocoId, type ApresentacaoConfig } from '@/lib/apresentacoes/tipos'
import { savePresentationConfig } from '@/lib/proposals/link-actions'

/** Blocos que todo template exige — não podem ser removidos pelo usuário. */
const BLOCOS_OBRIGATORIOS: BlocoId[] = ['cover', 'contato']

function moverBloco(blocos: BlocoId[], index: number, direcao: -1 | 1): BlocoId[] {
  const alvo = index + direcao
  if (alvo < 0 || alvo >= blocos.length) return blocos
  const copia = [...blocos]
  ;[copia[index], copia[alvo]] = [copia[alvo], copia[index]]
  return copia
}

export function ApresentacaoConfigurador({
  proposalId,
  configInicial,
}: {
  proposalId: string
  configInicial: ApresentacaoConfig | null
}) {
  const [aberto, setAberto] = useState(false)
  const [template, setTemplate] = useState(configInicial?.template ?? 'premium')
  const [tema, setTema] = useState(configInicial?.tema ?? TEMPLATES[template]?.temaPadrao ?? 'minimal-white')
  const [blocos, setBlocos] = useState<BlocoId[]>(configInicial?.blocos ?? blocosDoTemplate(template))
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const disponiveis = BLOCOS_VALIDOS.filter((b) => !blocos.includes(b))

  function handleTrocarTemplate(novoTemplate: string) {
    setTemplate(novoTemplate)
    setTema(TEMPLATES[novoTemplate]?.temaPadrao ?? 'minimal-white')
    setBlocos(blocosDoTemplate(novoTemplate))
  }

  function handleToggleBloco(bloco: BlocoId) {
    if (BLOCOS_OBRIGATORIOS.includes(bloco)) return
    setBlocos((prev) => prev.filter((b) => b !== bloco))
  }

  function handleAdicionarBloco(bloco: BlocoId) {
    setBlocos((prev) => [...prev, bloco])
  }

  function handleMover(index: number, direcao: -1 | 1) {
    setBlocos((prev) => moverBloco(prev, index, direcao))
  }

  async function handleSalvar() {
    setSalvando(true)
    setSalvo(false)
    const result = await savePresentationConfig(proposalId, { template, tema, blocos })
    setSalvando(false)
    if (!result.error) {
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } else {
      alert(result.error)
    }
  }

  return (
    <div>
      <button
        onClick={() => setAberto((v) => !v)}
        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-90"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-muted)', border: '1px solid var(--theme-border)' }}
      >
        Personalizar
      </button>

      {aberto && (
        <div
          className="mt-3 rounded-xl p-4 space-y-4"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
        >
          {/* Template */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
              Template
            </label>
            <select
              value={template}
              onChange={(e) => handleTrocarTemplate(e.target.value)}
              className="w-full mt-1 text-sm px-3 py-2 rounded-lg"
              style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)' }}
            >
              {Object.values(TEMPLATES).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} — {t.descricao}
                </option>
              ))}
            </select>
          </div>

          {/* Tema */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
              Tema
            </label>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="flex-1 text-sm px-3 py-2 rounded-lg"
                style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)' }}
              >
                {Object.values(TEMAS).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <span
                className="w-6 h-6 rounded-md flex-shrink-0"
                style={{ background: TEMAS[tema]?.corDestaque ?? '#000', border: '1px solid var(--theme-border)' }}
                title={TEMAS[tema]?.corDestaque}
              />
            </div>
          </div>

          {/* Blocos ativos */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
              Blocos ativos
            </label>
            <div className="flex flex-col gap-1.5 mt-1">
              {blocos.map((bloco, index) => {
                const obrigatorio = BLOCOS_OBRIGATORIOS.includes(bloco)
                return (
                  <div
                    key={bloco}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-border)' }}
                  >
                    <input
                      type="checkbox"
                      checked
                      disabled={obrigatorio}
                      onChange={() => handleToggleBloco(bloco)}
                      className="w-3.5 h-3.5 accent-green-500"
                    />
                    <span className="text-xs flex-1" style={{ color: 'var(--theme-text-muted)' }}>
                      {ROTULOS_BLOCO[bloco]}
                      {obrigatorio && <span style={{ color: 'var(--theme-text-subtle)' }}> (obrigatório)</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMover(index, -1)}
                      disabled={index === 0}
                      className="text-xs px-1.5 disabled:opacity-30"
                      style={{ color: 'var(--theme-text-subtle)' }}
                      aria-label={`Mover ${ROTULOS_BLOCO[bloco]} para cima`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMover(index, 1)}
                      disabled={index === blocos.length - 1}
                      className="text-xs px-1.5 disabled:opacity-30"
                      style={{ color: 'var(--theme-text-subtle)' }}
                      aria-label={`Mover ${ROTULOS_BLOCO[bloco]} para baixo`}
                    >
                      ↓
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Blocos disponíveis para adicionar */}
          {disponiveis.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-subtle)' }}>
                Adicionar bloco
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {disponiveis.map((bloco) => (
                  <button
                    key={bloco}
                    type="button"
                    onClick={() => handleAdicionarBloco(bloco)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-colors hover:opacity-90"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-muted)', border: '1px solid var(--theme-border)' }}
                  >
                    + {ROTULOS_BLOCO[bloco]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full text-xs py-2 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

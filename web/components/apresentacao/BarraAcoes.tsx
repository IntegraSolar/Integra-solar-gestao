'use client'

import { useEffect, useState } from 'react'

/**
 * Ações flutuantes da apresentação: baixar PDF e modo apresentação.
 *
 * Fica fora do fluxo dos blocos e some na impressão — não faz sentido um botão
 * "Baixar PDF" impresso dentro do próprio PDF.
 *
 * O modo apresentação existe para o vendedor mostrar ao vivo numa reunião: tela
 * cheia, um bloco por vez, navegação por setas ou clique.
 */
export function BarraAcoes({ token, totalBlocos }: { token: string; totalBlocos: number }) {
  const [apresentando, setApresentando] = useState(false)
  const [indice, setIndice] = useState(0)
  const [baixando, setBaixando] = useState(false)

  // Mostra só o bloco atual quando está apresentando.
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.apr__card'))
    cards.forEach((card, i) => {
      card.style.display = !apresentando || i === indice ? '' : 'none'
    })
    document.body.classList.toggle('apr-apresentando', apresentando)
    return () => {
      cards.forEach((card) => (card.style.display = ''))
      document.body.classList.remove('apr-apresentando')
    }
  }, [apresentando, indice])

  useEffect(() => {
    if (!apresentando) return

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setIndice((i) => Math.min(i + 1, totalBlocos - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setIndice((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Escape') {
        setApresentando(false)
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [apresentando, totalBlocos])

  async function entrarApresentacao() {
    setIndice(0)
    setApresentando(true)
    // Tela cheia é um plus: se o navegador recusar, a apresentação segue funcionando.
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      /* segue sem tela cheia */
    }
  }

  async function sairApresentacao() {
    setApresentando(false)
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.()
    } catch {
      /* já saiu */
    }
  }

  function baixarPdf() {
    setBaixando(true)
    // A primeira geração leva alguns segundos; as seguintes vêm do cache.
    window.open(`/api/proposta/${token}/pdf`, '_blank')
    setTimeout(() => setBaixando(false), 4000)
  }

  if (apresentando) {
    return (
      <div className="apr__apresentando-barra">
        <button type="button" onClick={() => setIndice((i) => Math.max(i - 1, 0))} disabled={indice === 0}>
          ←
        </button>
        <span>
          {indice + 1} / {totalBlocos}
        </span>
        <button
          type="button"
          onClick={() => setIndice((i) => Math.min(i + 1, totalBlocos - 1))}
          disabled={indice === totalBlocos - 1}
        >
          →
        </button>
        <button type="button" onClick={sairApresentacao} className="apr__sair">
          Sair
        </button>
      </div>
    )
  }

  return (
    <div className="apr__acoes">
      <button type="button" onClick={baixarPdf} disabled={baixando}>
        {baixando ? 'Gerando PDF...' : 'Baixar PDF'}
      </button>
      <button type="button" onClick={entrarApresentacao}>
        Apresentar
      </button>
    </div>
  )
}

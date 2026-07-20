// web/components/apresentacao/Apresentacao.tsx
import './tema.css'
import type { ApresentacaoData, ApresentacaoConfig, BlocoId } from '@/lib/apresentacoes/tipos'
import { Cover } from './blocos/Cover'
import { Resumo } from './blocos/Resumo'
import { Sistema } from './blocos/Sistema'
import { Equipamentos } from './blocos/Equipamentos'
import { Condicoes } from './blocos/Condicoes'
import { Contato } from './blocos/Contato'
import { Hero } from './blocos/Hero'
import { Garantias } from './blocos/Garantias'
import { LinhaDoTempo } from './blocos/LinhaDoTempo'
import { FluxoInstalacao } from './blocos/FluxoInstalacao'
import { ComoFunciona } from './blocos/ComoFunciona'
import { Assinatura } from './blocos/Assinatura'

const REGISTRO: Record<BlocoId, React.FC<{ dados: ApresentacaoData }>> = {
  cover: Cover,
  resumo: Resumo,
  sistema: Sistema,
  equipamentos: Equipamentos,
  condicoes: Condicoes,
  contato: Contato,
  hero: Hero,
  garantias: Garantias,
  timeline: LinhaDoTempo,
  fluxo: FluxoInstalacao,
  'como-funciona': ComoFunciona,
  assinatura: Assinatura,
}

export function Apresentacao({
  dados,
  config,
}: {
  dados: ApresentacaoData
  config: ApresentacaoConfig
}) {
  return (
    <div
      className="apr"
      data-tema={config.tema}
      // Cores da organização vencem as do tema: identidade da empresa em primeiro lugar.
      style={
        {
          '--apr-destaque': dados.tema.cor_texto,
          '--apr-destaque-cheia': dados.tema.cor_principal,
          '--apr-contraste': dados.tema.cor_secundaria,
        } as React.CSSProperties
      }
    >
      <div className="apr__wrap">
        {config.blocos.map((id) => {
          const Bloco = REGISTRO[id]
          // Bloco desconhecido não derruba a página do cliente final.
          if (!Bloco) return null
          return <Bloco key={id} dados={dados} />
        })}
      </div>
    </div>
  )
}

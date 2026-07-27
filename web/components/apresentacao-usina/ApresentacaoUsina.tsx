// web/components/apresentacao-usina/ApresentacaoUsina.tsx
import '@/components/apresentacao/tema.css'
import { BarraAcoes } from '@/components/apresentacao/BarraAcoes'
import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Capa } from './blocos/Capa'
import { Indicadores } from './blocos/Indicadores'
import { Usina } from './blocos/Usina'
import { Premissas } from './blocos/Premissas'
import { Custos } from './blocos/Custos'
import { Financiamento } from './blocos/Financiamento'
import { Retorno } from './blocos/Retorno'
import { Projecao } from './blocos/Projecao'
import { Empresa } from './blocos/Empresa'
import { Contato } from './blocos/Contato'

const BLOCOS = [Capa, Indicadores, Usina, Premissas, Custos, Financiamento, Retorno, Projecao, Empresa, Contato]

export function ApresentacaoUsina({ dados, token }: { dados: ApresentacaoUsinaData; token?: string }) {
  return (
    <div
      className="apr"
      data-tema="minimal-white"
      style={{
        '--apr-destaque': dados.tema.cor_texto,
        '--apr-destaque-cheia': dados.tema.cor_principal,
        '--apr-contraste': dados.tema.cor_secundaria,
      } as React.CSSProperties}
    >
      <div className="apr__wrap">
        {BLOCOS.map((B, i) => <B key={i} dados={dados} />)}
      </div>
      {token && <BarraAcoes token={token} totalBlocos={BLOCOS.length} pdfEndpoint="/api/proposta-usina" />}
    </div>
  )
}

// web/components/apresentacao/blocos/Resumo.tsx
import type { ApresentacaoData } from '@/lib/apresentacoes/tipos'
import { Secao } from '../primitivos/Secao'
import { Indicador } from '../primitivos/Indicador'

export function Resumo({ dados }: { dados: ApresentacaoData }) {
  return (
    <Secao titulo="Resumo do projeto">
      <div className="apr__grid">
        <Indicador rotulo="Potência instalada" valor={dados.sistema.potencia_kwp} />
        <Indicador rotulo="Geração estimada" valor={dados.sistema.geracao_mensal} />
        {dados.investimento.valor && (
          <Indicador rotulo="Investimento" valor={dados.investimento.valor} />
        )}
      </div>
    </Secao>
  )
}

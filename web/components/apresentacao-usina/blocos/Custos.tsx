import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Custos({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Custos totais do projeto">
      <dl className="apr-usina__lista">
        {dados.custos.map((l) => (
          <div key={l.rotulo} className="apr-usina__linha"><dt>{l.rotulo}</dt><dd>{l.valor}</dd></div>
        ))}
      </dl>
    </Secao>
  )
}

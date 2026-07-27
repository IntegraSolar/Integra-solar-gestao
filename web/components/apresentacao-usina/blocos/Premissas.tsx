import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Premissas({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Premissas do projeto">
      <dl className="apr-usina__lista">
        {dados.premissas.map((l) => (
          <div key={l.rotulo} className="apr-usina__linha">
            <dt>{l.rotulo}</dt><dd>{l.valor}</dd>
          </div>
        ))}
      </dl>
    </Secao>
  )
}

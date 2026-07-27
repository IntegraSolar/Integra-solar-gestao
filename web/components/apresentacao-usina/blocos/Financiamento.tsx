import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Financiamento({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Financiamento">
      <p className="apr-usina__resumo">{dados.financiamento.resumo}</p>
      <dl className="apr-usina__lista">
        {dados.financiamento.linhas.map((l) => (
          <div key={l.rotulo} className="apr-usina__linha"><dt>{l.rotulo}</dt><dd>{l.valor}</dd></div>
        ))}
      </dl>
    </Secao>
  )
}

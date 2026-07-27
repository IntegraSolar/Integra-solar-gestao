import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Retorno({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Cenários de retorno">
      <table className="apr-usina__tabela">
        <thead><tr><th></th><th>Capital próprio</th><th>Com financiamento</th></tr></thead>
        <tbody>
          {dados.retorno.cenarios.map((c) => (
            <tr key={c.rotulo}><td>{c.rotulo}</td><td>{c.proprio}</td><td>{c.financiado}</td></tr>
          ))}
        </tbody>
      </table>
    </Secao>
  )
}

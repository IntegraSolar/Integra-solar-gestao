import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Projecao({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Projeção de 25 anos">
      <div className="apr-usina__grafico-wrap" dangerouslySetInnerHTML={{ __html: dados.projecao.svg }} />
      <div className="apr-usina__tabela-scroll">
        <table className="apr-usina__tabela">
          <thead><tr><th>Ano</th><th>Produção (kWh)</th><th>Receita</th><th>OPEX</th><th>Fluxo próprio</th><th>Acumulado</th></tr></thead>
          <tbody>
            {dados.projecao.tabela.map((l) => (
              <tr key={l.ano}><td>{l.ano}</td><td>{l.producao}</td><td>{l.receita}</td><td>{l.opex}</td><td>{l.fluxoProprio}</td><td>{l.acumulado}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Secao>
  )
}

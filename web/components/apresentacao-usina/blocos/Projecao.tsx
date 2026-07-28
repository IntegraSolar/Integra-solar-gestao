import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'

export function Projecao({ dados }: { dados: ApresentacaoUsinaData }) {
  return (
    <Secao titulo="Análise Técnico-Econômica">
      <p className="apr-usina__subtitulo">
        Geração distribuída — UFVs com e sem financiamento — UCs baixa tensão — GD1 GD2 GD3
      </p>
      <div className="apr-usina__grafico-wrap" dangerouslySetInnerHTML={{ __html: dados.projecao.svg }} />
      <div className="apr-usina__tabela-scroll">
        <table className="apr-usina__tabela">
          <thead>
            <tr>
              <th>Ano</th>
              <th>Produção (kWh)</th>
              <th>Tarifa bruta (R$/kWh)</th>
              <th>% Fio B</th>
              <th>TUSD Fio B (R$/kWh)</th>
              <th>Tarifa líq. (R$/kWh)</th>
              <th>Receita</th>
              <th>Saldo devedor</th>
              <th>Amortização</th>
              <th>Juros</th>
              <th>Prestação</th>
              <th>OPEX</th>
              <th>Imposto</th>
              <th>Fluxo próprio</th>
              <th>Acum. próprio</th>
              <th>Fluxo c/ financ.</th>
              <th>Acum. c/ financ.</th>
            </tr>
          </thead>
          <tbody>
            {dados.projecao.tabela.map((l) => (
              <tr key={l.ano}>
                <td>{l.ano}</td>
                <td>{l.producao}</td>
                <td>{l.tarifaBruta}</td>
                <td>{l.fioBPct}</td>
                <td>{l.tusdFioB}</td>
                <td>{l.tarifa}</td>
                <td>{l.receita}</td>
                <td>{l.saldoDevedor}</td>
                <td>{l.amortizacao}</td>
                <td>{l.juros}</td>
                <td>{l.prestacao}</td>
                <td>{l.opex}</td>
                <td>{l.imposto}</td>
                <td>{l.fluxoProprio}</td>
                <td>{l.acumuladoProprio}</td>
                <td>{l.fluxoFinanciado}</td>
                <td>{l.acumuladoFinanciado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Secao>
  )
}

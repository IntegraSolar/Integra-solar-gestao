import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
export function Usina({ dados }: { dados: ApresentacaoUsinaData }) {
  const u = dados.usina
  const linhas: [string, string][] = [
    ['Modelo de compensação', u.modelo_compensacao],
    ['Regra de transição', u.regra_transicao],
    ['Concessionária', u.concessionaria],
    ['Potência pico', u.potencia_pico],
    ['Potência nominal', u.potencia_nominal],
    ['Painel FV', u.painel],
    ['Inversor(es)', u.inversor],
    ['Fator de capacidade', u.fator_capacidade],
    ['Geração anual', u.geracao_anual],
    ['Geração mensal', u.geracao_mensal],
    ['Tipo de usina', u.tipo_usina],
  ]
  return (
    <Secao titulo="A usina fotovoltaica">
      <dl className="apr-usina__lista">
        {linhas.map(([r, v]) => (
          <div key={r} className="apr-usina__linha"><dt>{r}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </Secao>
  )
}

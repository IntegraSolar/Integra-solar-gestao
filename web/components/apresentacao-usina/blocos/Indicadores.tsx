import type { ApresentacaoUsinaData } from '@/lib/apresentacoes-usina/tipos'
import { Secao } from '@/components/apresentacao/primitivos/Secao'
import { Indicador } from '@/components/apresentacao/primitivos/Indicador'
export function Indicadores({ dados }: { dados: ApresentacaoUsinaData }) {
  const i = dados.indicadores
  return (
    <Secao titulo="Retorno do investimento">
      <div className="apr__ind-grid">
        <Indicador rotulo="TIR" valor={i.tir} />
        <Indicador rotulo="VPL" valor={i.vpl} />
        <Indicador rotulo="Payback" valor={i.payback} />
        <Indicador rotulo="Potência" valor={i.potencia_kwp} />
        <Indicador rotulo="Geração anual" valor={i.geracao_anual} />
      </div>
    </Secao>
  )
}

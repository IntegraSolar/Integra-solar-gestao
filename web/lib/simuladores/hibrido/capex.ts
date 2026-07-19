// web/lib/simuladores/hibrido/capex.ts
// Composição do investimento: itens diretos → BDI → gross-up de margem e
// impostos (que incidem sobre o preço de venda, não sobre o custo).
import type {
  FisicoParaFinanceiro, ItemCapex, PrecosCapex, PremissasFinanceiras, ResultadoCapex,
} from './types'

export type ParamsCapex = {
  fisico: FisicoParaFinanceiro
  precos: PrecosCapex
  premissas: PremissasFinanceiras
}

function item(descricao: string, quantidade: number, custoUnitario: number): ItemCapex {
  return { descricao, quantidade, custoUnitario, subtotal: quantidade * custoUnitario }
}

export function calcularCapex(params: ParamsCapex): ResultadoCapex {
  const { fisico, precos, premissas } = params

  const itens: ItemCapex[] = [
    item('Módulos fotovoltaicos', fisico.numModulos, precos.moduloUnitario),
    item('Inversor / híbrido', fisico.numInversores, precos.inversorUnitario),
    item('Banco de baterias', fisico.numBaterias, precos.bateriaUnitaria),
    item('Estrutura de fixação', fisico.numModulos, precos.estruturaPorModulo),
    item('Cabeamento, conectores e proteções', fisico.potenciaInstaladaKwp, precos.cabeamentoPorKwp),
    item('Projeto, ART e homologação', 1, precos.projetoArt),
    item('Mão de obra / instalação', fisico.potenciaInstaladaKwp, precos.maoDeObraPorKwp),
    item('Frete, deslocamento e imprevistos', 1, precos.freteImprevistos),
  ]

  const custoDireto = itens.reduce((acc, i) => acc + i.subtotal, 0)
  const valorBdi = custoDireto * premissas.bdi
  const custoComBdi = custoDireto + valorBdi

  // Margem e impostos incidem sobre o preço de venda: preço = custo / (1 - m - i).
  const denominador = 1 - (premissas.margemLucro + premissas.impostos)
  const investimentoTotal = denominador > 0 ? custoComBdi / denominador : custoComBdi

  return {
    itens,
    custoDireto,
    valorBdi,
    custoComBdi,
    valorMargem: investimentoTotal * premissas.margemLucro,
    valorImpostos: investimentoTotal * premissas.impostos,
    investimentoTotal,
    investimentoPorKwp:
      fisico.potenciaInstaladaKwp > 0 ? investimentoTotal / fisico.potenciaInstaladaKwp : 0,
  }
}

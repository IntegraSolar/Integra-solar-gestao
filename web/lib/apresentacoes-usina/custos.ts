// web/lib/apresentacoes-usina/custos.ts
import type { ViabilidadeInput, ViabilidadeResultado } from '@/lib/simuladores/viabilidade/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number, d: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

/**
 * Bloco "Custos Totais do Projeto (Vida Útil)" — reproduz a seção C36:C44 da aba
 * "Viabilidade" da planilha. Todas as fórmulas são reproduzíveis pelo motor:
 *
 *  - Investimento inicial (C37)          = -CAPEX
 *  - Reestruturação do inversor (C38)    = -0,10·CAPEX·1,02^15
 *  - OPEX acumulado (VP) (C39)           = Σ(custos do ano 1: disponibilidade,
 *                                          demanda, arrendamento, OPEX, gestão,
 *                                          imposto) × 25
 *  - Total (C40)                         = C37 + C38 + C39
 *  - Tarifa própria de geração / LCoE (C43) = -[(C40 + Σ juros anos 0..12)/vida] / geração
 *  - Redução de CO₂ (C44)                = 86,77 · geração / 1000
 */
export function custosProjeto(
  input: ViabilidadeInput,
  resultado: ViabilidadeResultado,
): { rotulo: string; valor: string }[] {
  const capex = input.valorInvestimento
  const reestrut = 0.1 * capex * Math.pow(1.02, 15)

  const y1 = resultado.projecao[1]
  const opexAcumVP =
    (y1.custoDisponibilidade + y1.demandaGeracao + y1.arrendamento + y1.opex + y1.gestao + y1.imposto) * 25
  const total = -capex - reestrut + opexAcumVP

  // Média anual de custos inclui os juros pagos nos anos 0..12 (SUM(U2:U14)).
  const somaJuros = resultado.projecao.slice(0, 13).reduce((s, l) => s + l.juros, 0)
  const mediaAnual = (total + somaJuros) / input.horizonteAnos
  const lcoe = resultado.geracaoAnualKwh > 0 ? -mediaAnual / resultado.geracaoAnualKwh : 0
  const co2 = (86.77 * resultado.geracaoAnualKwh) / 1000

  return [
    { rotulo: 'Investimento inicial (CAPEX)', valor: '-' + brl(capex) },
    { rotulo: 'Reestruturação do inversor (ano 15)', valor: '-' + brl(reestrut) },
    { rotulo: 'OPEX acumulado (valor presente)', valor: brl(opexAcumVP) },
    { rotulo: 'Total dos custos (vida útil)', valor: brl(total) },
    { rotulo: 'Tarifa própria de geração (LCoE)', valor: `${num(lcoe, 4)} R$/kWh` },
    { rotulo: 'Redução de CO₂', valor: `${num(co2, 0)} kg/ano` },
    { rotulo: 'Vida útil do projeto', valor: `${input.horizonteAnos} anos` },
  ]
}

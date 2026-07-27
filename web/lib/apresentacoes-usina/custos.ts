// web/lib/apresentacoes-usina/custos.ts
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Linhas de "Custos totais do projeto" exibidas na proposta.
 *
 * O&M Acumulado (VP) e Total ficam de fora: o motor modela OPEX como
 * opexPct × CAPEX, que não reproduz o valor da planilha (composição mensal da
 * aba "Dados Projeto"). Incluir um número aproximado numa proposta de
 * investimento seria desonesto. Fórmulas reproduzíveis: CAPEX (entrada) e a
 * reestruturação do inversor no ano 15 (idêntica ao engine.ts).
 */
export function custosProjeto(input: ViabilidadeInput): { rotulo: string; valor: string }[] {
  const reestruturacao = 0.1 * input.valorInvestimento * Math.pow(1.02, 15)
  return [
    { rotulo: 'Investimento inicial (CAPEX)', valor: '-' + brl(input.valorInvestimento) },
    { rotulo: 'Reestruturação do inversor (ano 15)', valor: '-' + brl(reestruturacao) },
    { rotulo: 'Vida útil do projeto', valor: `${input.horizonteAnos} anos` },
  ]
}

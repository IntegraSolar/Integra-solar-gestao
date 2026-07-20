// web/lib/financeiro/totais.ts
import type { FinanceiroInstallment } from './queries'

export type FinanceiroTotais = {
  faturamento_total: number
  recebido: number
  a_receber: number
  em_atraso: number
}

/**
 * Agrega os totais do painel financeiro.
 *
 * Os quatro valores são globais (não seguem o filtro de mês da tela), de modo que
 * `recebido + a_receber + em_atraso === faturamento_total`. Um atraso de meses
 * anteriores continua visível ao olhar o mês corrente.
 *
 * `hoje` no formato YYYY-MM-DD — comparação lexicográfica com due_date (date).
 * Parcela que vence hoje ainda não está atrasada.
 */
export function computeFinanceiroTotais(
  installments: FinanceiroInstallment[],
  hoje: string
): FinanceiroTotais {
  let faturamento_total = 0
  let recebido = 0
  let a_receber = 0
  let em_atraso = 0

  for (const i of installments) {
    faturamento_total += i.amount
    if (i.status === 'confirmada') {
      recebido += i.amount
    } else if (i.due_date >= hoje) {
      a_receber += i.amount
    } else {
      em_atraso += i.amount
    }
  }

  return { faturamento_total, recebido, a_receber, em_atraso }
}

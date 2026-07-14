// Validação pura das parcelas do cliente (testável isoladamente).

export type InstallmentInput = {
  position?: number
  due_date?: string
  amount?: number | string
  notes?: string | null
}

/**
 * Valida as parcelas e reconcilia a soma com o valor da venda.
 * Retorna a mensagem de erro (para exibir ao usuário) ou null se estiver tudo ok.
 * - cada parcela precisa de valor > 0 e data de vencimento válida;
 * - a soma das parcelas precisa bater com o valor da venda (tolerância de arredondamento).
 */
export function validateInstallments(
  installments: InstallmentInput[],
  saleValue: number,
): string | null {
  if (!Array.isArray(installments) || installments.length === 0) {
    return 'Adicione pelo menos uma parcela.'
  }
  let soma = 0
  for (const inst of installments) {
    const amount = Number(inst.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Toda parcela deve ter um valor maior que zero.'
    }
    if (!inst.due_date || Number.isNaN(new Date(inst.due_date).getTime())) {
      return 'Toda parcela deve ter uma data de vencimento válida.'
    }
    soma += amount
  }
  // Tolerância de 5 centavos para arredondamento na divisão das parcelas.
  if (Math.abs(soma - saleValue) > 0.05) {
    return `A soma das parcelas (R$ ${soma.toFixed(2)}) não confere com o valor da venda (R$ ${saleValue.toFixed(2)}).`
  }
  return null
}

// web/lib/simuladores/cartao/calculo.ts

// Uma linha da tabela de parcelamento.
export type OpcaoParcelamento = {
  parcelas: number
  taxa: number       // fração (0.0669 = 6,69%)
  valorTotal: number
  valorParcela: number
}

// Valor que vai para o cartão: proposta menos entrada, nunca negativo.
export function valorAParcelar(valorProposta: number, entrada: number): number {
  return Math.max(0, valorProposta - entrada)
}

// Porta a fórmula da planilha. `taxas`: { nº de parcelas -> taxa (fração) }.
// repassar=true  -> total = V*(1+taxa); repassar=false -> total = V.
export function calcularTabelaCartao(
  valor: number,
  taxas: Record<number | string, number>,
  repassar: boolean,
): OpcaoParcelamento[] {
  return Object.keys(taxas)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => {
      const taxa = taxas[n]
      const valorTotal = repassar ? valor * (1 + taxa) : valor
      return { parcelas: n, taxa, valorTotal, valorParcela: n > 0 ? valorTotal / n : valorTotal }
    })
}

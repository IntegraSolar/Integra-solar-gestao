import { describe, it, expect } from 'vitest'
import { valorAParcelar, calcularTabelaCartao } from '@/lib/simuladores/cartao/calculo'

describe('valorAParcelar', () => {
  it('proposta - entrada, nunca negativo', () => {
    expect(valorAParcelar(50000, 8000)).toBe(42000)
    expect(valorAParcelar(1000, 1500)).toBe(0)
  })
})

describe('calcularTabelaCartao (golden da planilha)', () => {
  it('repassando: total = V*(1+taxa), parcela = total/N', () => {
    const [op] = calcularTabelaCartao(1000, { 6: 0.0669 }, true)
    expect(op.parcelas).toBe(6)
    expect(op.taxa).toBe(0.0669)
    expect(op.valorTotal).toBeCloseTo(1066.9, 6)
    expect(op.valorParcela).toBeCloseTo(177.81666666666666, 6)
  })
  it('sem repassar: total = V, parcela = V/N', () => {
    const [op] = calcularTabelaCartao(1000, { 6: 0.0669 }, false)
    expect(op.valorTotal).toBe(1000)
    expect(op.valorParcela).toBeCloseTo(166.66666666666666, 6)
  })
  it('ordena por nº de parcelas crescente', () => {
    const ops = calcularTabelaCartao(1000, { 12: 0.12, 1: 0.03, 6: 0.0669 }, true)
    expect(ops.map((o) => o.parcelas)).toEqual([1, 6, 12])
  })
})

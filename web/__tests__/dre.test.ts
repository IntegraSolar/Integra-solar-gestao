import { describe, it, expect } from 'vitest'
import { calcDRE, calcDRESummary } from '@/lib/financeiro/dre-calc'

// ─────────────────────────────────────────────────────────────────────────────
// calcDRE — cálculo individual por projeto
// ─────────────────────────────────────────────────────────────────────────────

describe('calcDRE', () => {
  it('calcula projeto lucrativo sem comissão', () => {
    const r = calcDRE({ saleValue: 50000, costAmounts: [20000, 5000], commissionPct: 0 })
    expect(r.totalCosts).toBe(25000)
    expect(r.commission).toBe(0)
    expect(r.grossProfit).toBe(25000)
    expect(r.netProfit).toBe(25000)
    expect(r.margin).toBeCloseTo(50, 5)
  })

  it('calcula comissão corretamente', () => {
    const r = calcDRE({ saleValue: 100000, costAmounts: [40000], commissionPct: 5 })
    expect(r.commission).toBe(5000)
    expect(r.netProfit).toBe(55000)
    expect(r.margin).toBeCloseTo(55, 5)
  })

  it('retorna margem zero quando receita é zero (sem divisão por zero)', () => {
    const r = calcDRE({ saleValue: 0, costAmounts: [1000], commissionPct: 10 })
    expect(r.margin).toBe(0)
    expect(r.netProfit).toBe(-1000)
  })

  it('detecta prejuízo quando custos superam receita', () => {
    const r = calcDRE({ saleValue: 10000, costAmounts: [12000], commissionPct: 0 })
    expect(r.netProfit).toBe(-2000)
    expect(r.margin).toBeCloseTo(-20, 5)
  })

  it('sem custos: lucro líquido = receita - comissão', () => {
    const r = calcDRE({ saleValue: 80000, costAmounts: [], commissionPct: 10 })
    expect(r.totalCosts).toBe(0)
    expect(r.commission).toBe(8000)
    expect(r.netProfit).toBe(72000)
    expect(r.margin).toBeCloseTo(90, 5)
  })

  it('comissão 0% não gera desconto', () => {
    const r = calcDRE({ saleValue: 50000, costAmounts: [10000], commissionPct: 0 })
    expect(r.commission).toBe(0)
    expect(r.netProfit).toBe(40000)
  })

  it('agrega múltiplos custos corretamente', () => {
    const r = calcDRE({ saleValue: 100000, costAmounts: [10000, 20000, 5000, 3000], commissionPct: 0 })
    expect(r.totalCosts).toBe(38000)
    expect(r.netProfit).toBe(62000)
  })

  it('grossProfit = receita - custos (antes da comissão)', () => {
    const r = calcDRE({ saleValue: 60000, costAmounts: [20000], commissionPct: 10 })
    expect(r.grossProfit).toBe(40000)
    expect(r.commission).toBe(6000)
    expect(r.netProfit).toBe(34000)
  })

  it('margem 100% quando não há custos nem comissão', () => {
    const r = calcDRE({ saleValue: 50000, costAmounts: [], commissionPct: 0 })
    expect(r.margin).toBeCloseTo(100, 5)
    expect(r.netProfit).toBe(50000)
  })

  it('custo único igual à receita: margem zero', () => {
    const r = calcDRE({ saleValue: 30000, costAmounts: [30000], commissionPct: 0 })
    expect(r.netProfit).toBe(0)
    expect(r.margin).toBeCloseTo(0, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcDRESummary — consolidação de múltiplos projetos
// ─────────────────────────────────────────────────────────────────────────────

describe('calcDRESummary', () => {
  const projects = [
    { id: 'a', revenue: 100000, costs: 40000, profit: 55000, margin: 55 },
    { id: 'b', revenue: 50000,  costs: 30000, profit: 18000, margin: 36 },
    { id: 'c', revenue: 20000,  costs: 25000, profit: -5000, margin: -25 },
  ]

  it('soma receita total corretamente', () => {
    const r = calcDRESummary(projects)
    expect(r.totalRevenue).toBe(170000)
  })

  it('soma custos totais corretamente', () => {
    const r = calcDRESummary(projects)
    expect(r.totalCosts).toBe(95000)
  })

  it('soma lucro total corretamente', () => {
    const r = calcDRESummary(projects)
    expect(r.totalProfit).toBe(68000)
  })

  it('margem ponderada = totalProfit / totalRevenue', () => {
    const r = calcDRESummary(projects)
    expect(r.weightedMargin).toBeCloseTo((68000 / 170000) * 100, 5)
  })

  it('identifica o projeto mais lucrativo', () => {
    const r = calcDRESummary(projects)
    expect(r.mostProfitableId).toBe('a')
  })

  it('identifica o projeto menos lucrativo', () => {
    const r = calcDRESummary(projects)
    expect(r.leastProfitableId).toBe('c')
  })

  it('com apenas 1 projeto: leastProfitableId é null (não duplica)', () => {
    const r = calcDRESummary([{ id: 'x', revenue: 50000, costs: 10000, profit: 40000, margin: 80 }])
    expect(r.mostProfitableId).toBe('x')
    expect(r.leastProfitableId).toBeNull()
  })

  it('com lista vazia: retorna zeros e nulls', () => {
    const r = calcDRESummary([])
    expect(r.totalRevenue).toBe(0)
    expect(r.totalProfit).toBe(0)
    expect(r.weightedMargin).toBe(0)
    expect(r.mostProfitableId).toBeNull()
    expect(r.leastProfitableId).toBeNull()
  })

  it('com 2 projetos: most e least são diferentes', () => {
    const two = [
      { id: 'x', revenue: 80000, costs: 20000, profit: 60000, margin: 75 },
      { id: 'y', revenue: 80000, costs: 70000, profit: 10000, margin: 12.5 },
    ]
    const r = calcDRESummary(two)
    expect(r.mostProfitableId).toBe('x')
    expect(r.leastProfitableId).toBe('y')
  })

  it('margem ponderada zero quando receita total é zero', () => {
    const r = calcDRESummary([{ id: 'z', revenue: 0, costs: 5000, profit: -5000, margin: 0 }])
    expect(r.weightedMargin).toBe(0)
  })
})

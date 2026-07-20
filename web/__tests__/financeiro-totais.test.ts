import { describe, it, expect } from 'vitest'
import { computeFinanceiroTotais } from '@/lib/financeiro/totais'
import type { FinanceiroInstallment } from '@/lib/financeiro/queries'

const HOJE = '2026-07-20'

function parcela(over: Partial<FinanceiroInstallment>): FinanceiroInstallment {
  return {
    id: 'i1',
    client_id: 'c1',
    client_name: 'Cliente',
    position: 1,
    due_date: '2026-07-10',
    amount: 100,
    notes: null,
    status: 'pendente',
    confirmed_at: null,
    payment_proof_url: null,
    ...over,
  }
}

describe('computeFinanceiroTotais', () => {
  it('faturamento total soma todas as parcelas, pagas ou não', () => {
    const t = computeFinanceiroTotais(
      [
        parcela({ amount: 100, status: 'confirmada' }),
        parcela({ amount: 250, status: 'pendente', due_date: '2026-07-25' }),
        parcela({ amount: 50, status: 'pendente', due_date: '2026-07-01' }),
      ],
      HOJE
    )
    expect(t.faturamento_total).toBe(400)
  })

  it('recebido soma apenas as parcelas confirmadas', () => {
    const t = computeFinanceiroTotais(
      [
        parcela({ amount: 100, status: 'confirmada' }),
        parcela({ amount: 30, status: 'confirmada' }),
        parcela({ amount: 999, status: 'pendente' }),
      ],
      HOJE
    )
    expect(t.recebido).toBe(130)
  })

  it('a receber soma pendentes ainda não vencidas', () => {
    const t = computeFinanceiroTotais(
      [
        parcela({ amount: 100, status: 'pendente', due_date: '2026-07-25' }),
        parcela({ amount: 40, status: 'pendente', due_date: '2026-08-01' }),
        parcela({ amount: 999, status: 'pendente', due_date: '2026-07-01' }),
      ],
      HOJE
    )
    expect(t.a_receber).toBe(140)
  })

  it('parcela que vence hoje conta como a receber, não como atraso', () => {
    const t = computeFinanceiroTotais([parcela({ amount: 100, due_date: HOJE })], HOJE)
    expect(t.a_receber).toBe(100)
    expect(t.em_atraso).toBe(0)
  })

  it('em atraso soma pendentes já vencidas', () => {
    const t = computeFinanceiroTotais(
      [
        parcela({ amount: 100, status: 'pendente', due_date: '2026-07-01' }),
        parcela({ amount: 60, status: 'pendente', due_date: '2026-06-15' }),
        parcela({ amount: 999, status: 'pendente', due_date: '2026-07-25' }),
      ],
      HOJE
    )
    expect(t.em_atraso).toBe(160)
  })

  it('parcela confirmada em atraso não entra em em_atraso', () => {
    const t = computeFinanceiroTotais(
      [parcela({ amount: 100, status: 'confirmada', due_date: '2026-01-01' })],
      HOJE
    )
    expect(t.em_atraso).toBe(0)
    expect(t.recebido).toBe(100)
  })

  it('os três componentes fecham no faturamento total', () => {
    const parcelas = [
      parcela({ amount: 100, status: 'confirmada', due_date: '2026-06-01' }),
      parcela({ amount: 250, status: 'pendente', due_date: '2026-07-25' }),
      parcela({ amount: 75, status: 'pendente', due_date: '2026-07-02' }),
    ]
    const t = computeFinanceiroTotais(parcelas, HOJE)
    expect(t.recebido + t.a_receber + t.em_atraso).toBe(t.faturamento_total)
  })

  it('lista vazia zera todos os totais', () => {
    expect(computeFinanceiroTotais([], HOJE)).toEqual({
      faturamento_total: 0,
      recebido: 0,
      a_receber: 0,
      em_atraso: 0,
    })
  })
})

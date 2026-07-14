import { describe, it, expect } from 'vitest'
import { validateInstallments } from '@/lib/clients/installments'

describe('validateInstallments', () => {
  const ok = [
    { position: 1, due_date: '2026-08-10', amount: 500 },
    { position: 2, due_date: '2026-09-10', amount: 500 },
  ]

  it('aceita parcelas válidas que somam o valor da venda', () => {
    expect(validateInstallments(ok, 1000)).toBeNull()
  })

  it('tolera arredondamento de ate 5 centavos', () => {
    const p = [
      { position: 1, due_date: '2026-08-10', amount: 333.33 },
      { position: 2, due_date: '2026-09-10', amount: 333.33 },
      { position: 3, due_date: '2026-10-10', amount: 333.34 },
    ]
    expect(validateInstallments(p, 1000)).toBeNull()
  })

  it('rejeita lista vazia', () => {
    expect(validateInstallments([], 1000)).toMatch(/pelo menos uma parcela/i)
  })

  it('rejeita parcela com valor <= 0 ou NaN', () => {
    expect(validateInstallments([{ due_date: '2026-08-10', amount: 0 }], 0)).toMatch(/maior que zero/i)
    expect(validateInstallments([{ due_date: '2026-08-10', amount: -100 }], -100)).toMatch(/maior que zero/i)
    expect(validateInstallments([{ due_date: '2026-08-10', amount: 'abc' }], 100)).toMatch(/maior que zero/i)
  })

  it('rejeita data de vencimento inválida', () => {
    expect(validateInstallments([{ due_date: 'xx/xx/xxxx', amount: 100 }], 100)).toMatch(/data de vencimento/i)
    expect(validateInstallments([{ amount: 100 }], 100)).toMatch(/data de vencimento/i)
  })

  it('rejeita quando a soma nao bate com o valor da venda', () => {
    expect(validateInstallments(ok, 1200)).toMatch(/não confere/i)
  })
})

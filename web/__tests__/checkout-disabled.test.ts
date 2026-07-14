import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { processCheckout } from '@/lib/subscription/actions'

/**
 * Regressão de segurança: o cadastro público via /checkout deve permanecer
 * desativado a menos que ENABLE_PUBLIC_CHECKOUT === 'true'. Impede reabertura
 * acidental do auto-cadastro (modelo é backoffice-only).
 */
describe('processCheckout — cadastro público desativado', () => {
  const original = process.env.ENABLE_PUBLIC_CHECKOUT

  beforeEach(() => { delete process.env.ENABLE_PUBLIC_CHECKOUT })
  afterEach(() => { if (original !== undefined) process.env.ENABLE_PUBLIC_CHECKOUT = original })

  it('recusa quando a flag não está habilitada', async () => {
    const r = await processCheckout({}, new FormData())
    expect(r.error).toMatch(/desativado/i)
  })

  it('recusa também com a flag em valor inválido', async () => {
    process.env.ENABLE_PUBLIC_CHECKOUT = 'false'
    const r = await processCheckout({}, new FormData())
    expect(r.error).toMatch(/desativado/i)
  })
})

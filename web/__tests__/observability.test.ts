import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mocka o Sentry para não enviar nada de verdade e permitir asserções.
const captureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({ captureException: (...a: unknown[]) => captureException(...a) }))

import { newRequestId, reportError, logStart, logOk, type OpContext } from '@/lib/observability'

const ctx: OpContext = { module: 'test', action: 'acao', requestId: 'req12345', tenant: 'org1', user: 'user1' }

describe('newRequestId', () => {
  it('retorna string curta de 8 chars', () => {
    const id = newRequestId()
    expect(typeof id).toBe('string')
    expect(id.length).toBe(8)
  })

  it('gera IDs distintos', () => {
    expect(newRequestId()).not.toBe(newRequestId())
  })
})

describe('reportError', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    captureException.mockClear()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('registra no logger e captura no Sentry, retornando a mensagem', () => {
    const msg = reportError(ctx, new Error('boom'))
    expect(msg).toBe('boom')
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(captureException).toHaveBeenCalledOnce()
  })

  it('lida com erro non-Error', () => {
    const msg = reportError(ctx, 'string de erro')
    expect(msg).toBe('string de erro')
    expect(captureException).toHaveBeenCalledOnce()
  })

  it('não lança exceção (nunca quebra o fluxo do chamador)', () => {
    expect(() => reportError(ctx, new Error('x'))).not.toThrow()
  })
})

describe('logStart / logOk', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) })
  afterEach(() => vi.restoreAllMocks())

  it('logStart e logOk registram no logger sem lançar', () => {
    expect(() => { logStart(ctx); logOk(ctx) }).not.toThrow()
    expect(logSpy).toHaveBeenCalledTimes(2)
  })
})

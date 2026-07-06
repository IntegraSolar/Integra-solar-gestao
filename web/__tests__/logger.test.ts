import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mask, logger } from '@/lib/logger'

describe('mask', () => {
  it('mascara IDs longos mostrando início e fim', () => {
    const result = mask('abc12345xyz67890')
    expect(result).toBe('abc1…7890')
  })

  it('mascara strings curtas (≤8 chars) com ***', () => {
    expect(mask('abc12345')).toBe('***')
    expect(mask('ab')).toBe('***')
  })

  it('retorna [unknown] para null', () => {
    expect(mask(null)).toBe('[unknown]')
  })

  it('retorna [unknown] para undefined', () => {
    expect(mask(undefined)).toBe('[unknown]')
  })

  it('retorna [unknown] para string vazia', () => {
    expect(mask('')).toBe('[unknown]')
  })

  it('mascara UUID típico', () => {
    const uuid = 'bnmyvxwc-msrn-xqml-uchp-000000000001'
    const result = mask(uuid)
    expect(result).toMatch(/^bnmy…0001$/)
  })
})

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logger.info chama console.log', () => {
    logger.info('test', 'mensagem de info')
    expect(consoleSpy).toHaveBeenCalledOnce()
    const arg = consoleSpy.mock.calls[0][0] as string
    expect(arg).toContain('info')
    expect(arg).toContain('test')
    expect(arg).toContain('mensagem de info')
  })

  it('logger.warn chama console.warn', () => {
    logger.warn('test', 'mensagem de aviso')
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('logger.error chama console.error', () => {
    logger.error('test', 'mensagem de erro')
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('logger.error inclui error.message no output', () => {
    logger.error('test', 'falha', new Error('erro interno'))
    expect(errorSpy).toHaveBeenCalledOnce()
    const arg = errorSpy.mock.calls[0][0] as string
    expect(arg).toContain('erro interno')
  })

  it('logger.error com string non-Error inclui a string', () => {
    logger.error('test', 'falha', 'algo deu errado')
    const arg = errorSpy.mock.calls[0][0] as string
    expect(arg).toContain('algo deu errado')
  })

  it('logger.info com meta inclui metadados', () => {
    logger.info('test', 'msg', { userId: 'user_001' })
    const arg = consoleSpy.mock.calls[0][0] as string
    expect(arg).toContain('user_001')
  })
})

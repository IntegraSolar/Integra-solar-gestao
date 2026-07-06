import { describe, it, expect, beforeEach, vi } from 'vitest'

// Garante que o módulo usa o fallback in-memory (sem Upstash)
vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')

// Importa APÓS o stub de env para que hasUpstash seja false
const { rateLimit, rateLimitResponse } = await import('@/lib/rate-limit')

describe('rateLimit (in-memory fallback)', () => {
  // Cada teste usa uma chave única para evitar conflito de estado
  let key: string

  beforeEach(() => {
    key = `test-${Math.random().toString(36).slice(2)}`
  })

  it('permite a primeira requisição', async () => {
    const allowed = await rateLimit(key, 3, 60_000)
    expect(allowed).toBe(true)
  })

  it('permite até o limite', async () => {
    for (let i = 0; i < 3; i++) {
      const allowed = await rateLimit(key, 3, 60_000)
      expect(allowed).toBe(true)
    }
  })

  it('bloqueia após exceder o limite', async () => {
    for (let i = 0; i < 3; i++) {
      await rateLimit(key, 3, 60_000)
    }
    const blocked = await rateLimit(key, 3, 60_000)
    expect(blocked).toBe(false)
  })

  it('reseta após a janela expirar', async () => {
    // Usa janela muito curta (1ms) para garantir expiração
    await rateLimit(key, 1, 1)
    await new Promise((r) => setTimeout(r, 5))
    const allowed = await rateLimit(key, 1, 1)
    expect(allowed).toBe(true)
  })

  it('chaves diferentes são independentes', async () => {
    const key2 = `${key}-outro`
    await rateLimit(key, 1, 60_000)
    await rateLimit(key, 1, 60_000) // bloqueia key
    const allowed = await rateLimit(key2, 1, 60_000)
    expect(allowed).toBe(true)
  })
})

describe('rateLimitResponse', () => {
  it('retorna status 429', () => {
    const res = rateLimitResponse()
    expect(res.status).toBe(429)
  })

  it('retorna header Retry-After', () => {
    const res = rateLimitResponse()
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('retorna Content-Type JSON', () => {
    const res = rateLimitResponse()
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('corpo contém mensagem de erro', async () => {
    const res = rateLimitResponse()
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(typeof body.error).toBe('string')
  })
})

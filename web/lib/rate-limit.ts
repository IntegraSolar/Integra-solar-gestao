// Rate limiter com Upstash Redis quando configurado, fallback in-memory para dev local.
// Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel para ativar
// o rate limiting distribuído (efetivo em ambientes serverless multi-instância).

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Fallback in-memory (dev local ou Upstash não configurado) ──────────────
type Entry = { count: number; resetAt: number }
const memoryStore = new Map<string, Entry>()

function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── Upstash Redis (produção) ───────────────────────────────────────────────
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Cache de limiters por configuração (limit_window)
const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${limit}_${windowSeconds}`
  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        analytics: false,
      })
    )
  }
  return limiterCache.get(cacheKey)!
}

// ── API pública ────────────────────────────────────────────────────────────
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!hasUpstash) {
    return memoryRateLimit(key, limit, windowMs)
  }

  try {
    const windowSeconds = Math.ceil(windowMs / 1000)
    const limiter = getUpstashLimiter(limit, windowSeconds)
    const { success } = await limiter.limit(key)
    return success
  } catch {
    // Se Redis falhar, permite a requisição (fail-open) para não derrubar a app
    return memoryRateLimit(key, limit, windowMs)
  }
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
  )
}

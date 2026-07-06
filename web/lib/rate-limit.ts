// Simple in-memory rate limiter for Next.js route handlers.
// Works per-instance; sufficient for Vercel serverless where each function
// handles its own request volume. For multi-region deployments, replace
// with a Redis-backed solution (e.g. Upstash).

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
  )
}

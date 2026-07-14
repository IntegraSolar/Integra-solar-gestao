import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'

// Configuração CENTRALIZADA dos limites por categoria de rota.
// Ajuste os valores aqui — não espalhe números pelo projeto.
export type RatePolicy = { limit: number; windowMs: number }

export const RATE_POLICIES = {
  // Portais públicos por token (cliente/projetista/instalador/recibos) — por IP.
  publicToken: { limit: 60, windowMs: 60_000 },
  // APIs autenticadas de leitura/listagem — por organização.
  sensitiveApi: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RatePolicy>

/** IP do cliente a partir dos headers de proxy (Vercel/edge). */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip') ?? 'unknown'
}

/** 429 padronizado com Retry-After e RateLimit-*. Nunca revela detalhes internos. */
export function tooManyRequests(policy: RatePolicy): Response {
  const reset = Math.ceil(policy.windowMs / 1000)
  return new Response(
    JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(reset),
        'RateLimit-Limit': String(policy.limit),
        'RateLimit-Remaining': '0',
        'RateLimit-Reset': String(reset),
      },
    }
  )
}

/**
 * Aplica o rate limit. Retorna uma Response 429 se o limite for excedido, ou
 * null se estiver ok. Uso:
 *   const blocked = await enforceRate(key, RATE_POLICIES.publicToken)
 *   if (blocked) return blocked
 */
export async function enforceRate(key: string, policy: RatePolicy): Promise<Response | null> {
  const ok = await rateLimit(key, policy.limit, policy.windowMs)
  return ok ? null : tooManyRequests(policy)
}

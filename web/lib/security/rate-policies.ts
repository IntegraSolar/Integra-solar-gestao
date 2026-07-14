import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

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
  if (ok) return null
  // Observabilidade: registra só o prefixo da chave (rota/categoria), sem IP/PII.
  logSecurityEvent('rate_limit_exceeded', { scope: key.split(':').slice(0, 2).join(':') })
  return tooManyRequests(policy)
}

// ── Observabilidade de segurança ─────────────────────────────────────────────
export type SecurityEvent =
  | 'rate_limit_exceeded'
  | 'bot_blocked'
  | 'login_backoff'
  | 'pdf_concurrency_blocked'

/** Log estruturado de eventos de segurança (para auditoria/monitoramento). */
export function logSecurityEvent(event: SecurityEvent, details: Record<string, unknown> = {}) {
  logger.warn('security', event, details)
}

// ── Detecção de bot (conservadora) ───────────────────────────────────────────
// UAs de ferramentas de automação/scraping/scan inequívocas — nunca enviadas por
// navegadores reais, então bloqueá-las tem risco de falso-positivo quase nulo.
const SCRAPER_UA =
  /(curl|wget|python-requests|python-urllib|scrapy|go-http-client|libwww|java\/|nikto|sqlmap|nmap|masscan|zgrab|semrush|ahrefs|mj12bot|dotbot)/i

export function classifyUserAgent(ua: string | null): 'human' | 'suspect' | 'tool' {
  if (!ua || ua.trim() === '') return 'suspect'
  if (SCRAPER_UA.test(ua)) return 'tool'
  return 'human'
}

/**
 * Guarda para rotas públicas por token (portais). Bloqueia ferramentas de
 * scraping por User-Agent (403) e aplica rate limit por IP. Retorna Response
 * de bloqueio ou null se liberado.
 */
export async function guardPublicToken(prefix: string): Promise<Response | null> {
  const h = await headers()
  const ua = h.get('user-agent')
  if (classifyUserAgent(ua) === 'tool') {
    logSecurityEvent('bot_blocked', { route: prefix, ua: (ua ?? '').slice(0, 40) })
    return new Response(JSON.stringify({ error: 'Acesso não permitido.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const ip = await getClientIp()
  return enforceRate(`pub:${prefix}:${ip}`, RATE_POLICIES.publicToken)
}

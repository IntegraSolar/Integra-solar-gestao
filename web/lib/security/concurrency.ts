import { Redis } from '@upstash/redis'

// Primitivas de resiliência (concorrência e backoff) sobre o mesmo Upstash Redis
// já usado pelo rate limiter. Fallback in-memory para dev/instância única.
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)
const redis = hasUpstash ? Redis.fromEnv() : null

const mem = new Map<string, number>()

/**
 * Adquire um "slot" de concorrência. Retorna ok=false se o máximo já estiver em
 * uso (ex.: N gerações de PDF simultâneas por organização). O TTL é uma trava de
 * segurança contra vazamento do contador caso o release não rode (crash/timeout).
 */
export async function acquireSlot(
  key: string,
  max: number,
  ttlSec: number,
): Promise<{ ok: boolean; release: () => Promise<void> }> {
  const noop = async () => {}
  if (!redis) {
    const n = (mem.get(key) ?? 0) + 1
    if (n > max) return { ok: false, release: noop }
    mem.set(key, n)
    let released = false
    return { ok: true, release: async () => { if (released) return; released = true; mem.set(key, Math.max(0, (mem.get(key) ?? 1) - 1)) } }
  }
  try {
    const n = await redis.incr(key)
    if (n === 1) await redis.expire(key, ttlSec)
    if (n > max) { await redis.decr(key); return { ok: false, release: noop } }
    let released = false
    return { ok: true, release: async () => { if (released) return; released = true; try { await redis.decr(key) } catch {} } }
  } catch {
    // fail-open: erro de Redis não deve derrubar a operação
    return { ok: true, release: noop }
  }
}

/** Incrementa um contador com janela (TTL) e retorna o valor atual. Usado no backoff. */
export async function incrWithWindow(key: string, ttlSec: number): Promise<number> {
  if (!redis) {
    const n = (mem.get(key) ?? 0) + 1
    mem.set(key, n)
    return n
  }
  try {
    const n = await redis.incr(key)
    if (n === 1) await redis.expire(key, ttlSec)
    return n
  } catch {
    return 1
  }
}

/** Zera um contador (ex.: após login bem-sucedido). */
export async function resetCount(key: string): Promise<void> {
  if (!redis) { mem.delete(key); return }
  try { await redis.del(key) } catch {}
}

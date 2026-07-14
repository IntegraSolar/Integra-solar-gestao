import { describe, it, expect } from 'vitest'
import { acquireSlot, incrWithWindow, resetCount } from '@/lib/security/concurrency'

// Sem UPSTASH no ambiente de teste → exercita o fallback in-memory.
describe('concurrency (fallback in-memory)', () => {
  it('limita slots ao máximo e libera corretamente', async () => {
    const k = 'test:slots:' + Math.random()
    const a = await acquireSlot(k, 2, 120)
    const b = await acquireSlot(k, 2, 120)
    const c = await acquireSlot(k, 2, 120)
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(c.ok).toBe(false) // 3º excede o máximo de 2
    await a.release()
    const d = await acquireSlot(k, 2, 120)
    expect(d.ok).toBe(true) // liberou 1 → cabe de novo
  })

  it('release é idempotente (não libera duas vezes)', async () => {
    const k = 'test:idem:' + Math.random()
    const a = await acquireSlot(k, 1, 120)
    await a.release()
    await a.release() // chamada duplicada não deve creditar slot extra
    const b = await acquireSlot(k, 1, 120)
    expect(b.ok).toBe(true)
    const c = await acquireSlot(k, 1, 120)
    expect(c.ok).toBe(false) // b ainda ocupa o único slot
  })

  it('incrWithWindow conta e resetCount zera', async () => {
    const k = 'test:cnt:' + Math.random()
    expect(await incrWithWindow(k, 900)).toBe(1)
    expect(await incrWithWindow(k, 900)).toBe(2)
    await resetCount(k)
    expect(await incrWithWindow(k, 900)).toBe(1)
  })
})

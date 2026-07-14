import { describe, it, expect, vi, beforeEach } from 'vitest'

const updates: Array<[string, any]> = []
const getAssinatura = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({ get: () => ({ value: 'tok' }) }) }))
vi.mock('@/lib/backoffice/auth/session', () => ({
  SESSION_COOKIE: '__bo_session',
  verifySession: vi.fn().mockResolvedValue({ name: 'Admin' }),
}))
vi.mock('@/lib/backoffice/auditoria/queries', () => ({ registrarAuditoria: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./queries', () => ({ getAssinatura: () => getAssinatura() }))
vi.mock('@/lib/backoffice/assinaturas/queries', () => ({ getAssinatura: () => getAssinatura() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      update: (payload: any) => { updates.push([table, payload]); return { eq: () => Promise.resolve({ error: null }) } },
    }),
  }),
}))

import { renovarAssinatura, cancelarAssinatura } from '@/lib/backoffice/assinaturas/actions'

describe('ciclo de assinatura', () => {
  beforeEach(() => { updates.length = 0; getAssinatura.mockReset() })

  it('renovar avança o vencimento e reativa a assinatura', async () => {
    getAssinatura.mockResolvedValue({ id: 'sub1', billing_cycle: 'monthly', expires_at: '2026-01-01T00:00:00Z' })
    const r = await renovarAssinatura('orgA')
    expect(r.error).toBeUndefined()
    const sub = updates.find(([t]) => t === 'subscriptions')?.[1]
    expect(sub.status).toBe('active')
    expect(new Date(sub.expires_at).getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime())
  })

  it('cancelar marca a assinatura como canceled', async () => {
    getAssinatura.mockResolvedValue({ id: 'sub1', billing_cycle: 'monthly', expires_at: '2026-06-01T00:00:00Z' })
    const r = await cancelarAssinatura('orgA')
    expect(r.error).toBeUndefined()
    const sub = updates.find(([t]) => t === 'subscriptions')?.[1]
    expect(sub.status).toBe('canceled')
  })

  it('renovar sem assinatura retorna erro claro', async () => {
    getAssinatura.mockResolvedValue(null)
    const r = await renovarAssinatura('orgA')
    expect(r.error).toMatch(/renovar/i)
  })
})

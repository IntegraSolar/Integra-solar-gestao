import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regressão de resiliência: o funil (getLeads) deve excluir leads convertidos
 * (converted = false) — eles viram clientes e não devem lotar o board, evitando
 * crescimento infinito e truncamento silencioso.
 */

const eqCalls: Array<[string, unknown]> = []

function builder() {
  const b: Record<string, unknown> = {}
  const chain = () => b
  b.select = chain
  b.order = chain
  b.limit = chain
  b.eq = (col: string, val: unknown) => { eqCalls.push([col, val]); return b }
  // torna o builder "awaitable" resolvendo para { data: [] }
  ;(b as any).then = (resolve: (v: unknown) => void) => resolve({ data: [] })
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: () => builder() }),
}))
vi.mock('@/lib/org/queries', () => ({
  getCurrentUserData: vi.fn().mockResolvedValue({ membership: { organization: { id: 'orgA' } } }),
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import { getLeads } from '@/lib/crm/queries'

describe('getLeads — funil exclui convertidos', () => {
  beforeEach(() => { eqCalls.length = 0 })

  it('filtra por converted = false', async () => {
    await getLeads()
    expect(eqCalls).toContainEqual(['converted', false])
  })

  it('filtra pela organização do usuário', async () => {
    await getLeads()
    expect(eqCalls).toContainEqual(['organization_id', 'orgA'])
  })
})

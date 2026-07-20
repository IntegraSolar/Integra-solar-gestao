import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regressão de resiliência: o funil (getLeads) deve excluir leads convertidos
 * (converted = false) — eles viram clientes e não devem lotar o board, evitando
 * crescimento infinito e truncamento silencioso.
 */

const eqCalls: Array<[string, unknown]> = []
const orCalls: string[] = []

function builder() {
  const b: Record<string, unknown> = {}
  const chain = () => b
  b.select = chain
  b.order = chain
  b.limit = chain
  b.eq = (col: string, val: unknown) => { eqCalls.push([col, val]); return b }
  b.or = (expr: string) => { orCalls.push(expr); return b }
  // torna o builder "awaitable" resolvendo para { data: [] }
  ;(b as any).then = (resolve: (v: unknown) => void) => resolve({ data: [] })
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: () => builder() }),
}))
const getCurrentUserData = vi.fn()
vi.mock('@/lib/org/queries', () => ({
  getCurrentUserData: () => getCurrentUserData(),
}))

const ADMIN = {
  profile: { id: 'admin-1' },
  membership: { organization: { id: 'orgA' }, role: 'admin', permissions: {} },
}
const VENDEDOR = {
  profile: { id: 'vend-1' },
  membership: {
    organization: { id: 'orgA' },
    role: 'vendedor',
    permissions: { leads: { access: true, view_all: false, add: true, edit: true, delete: true, export: false } },
  },
}
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import { getLeads } from '@/lib/crm/queries'

describe('getLeads — funil exclui convertidos', () => {
  beforeEach(() => {
    eqCalls.length = 0
    orCalls.length = 0
    getCurrentUserData.mockResolvedValue(ADMIN)
  })

  it('filtra por converted = false', async () => {
    await getLeads()
    expect(eqCalls).toContainEqual(['converted', false])
  })

  it('filtra pela organização do usuário', async () => {
    await getLeads()
    expect(eqCalls).toContainEqual(['organization_id', 'orgA'])
  })

  it('não restringe por usuário quem vê todos os leads', async () => {
    await getLeads()
    expect(orCalls).toHaveLength(0)
  })

  it('restringe ao próprio vendedor quem não vê todos', async () => {
    getCurrentUserData.mockResolvedValue(VENDEDOR)
    await getLeads()
    expect(orCalls).toEqual(['assigned_to_user_id.eq.vend-1,created_by.eq.vend-1'])
  })

  it('sem identidade não devolve leads (fail closed)', async () => {
    getCurrentUserData.mockResolvedValue({ ...VENDEDOR, profile: undefined })
    expect(await getLeads()).toEqual([])
  })
})

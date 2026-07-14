import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regressão de segurança: resetColaboradorPassword não pode redefinir a senha
 * de um usuário que pertence a OUTRA organização (IDOR → account takeover).
 */

const updateUserById = vi.fn()
let memberLookupResult: { data: unknown } = { data: null }

vi.mock('@/lib/org/permissions', () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/org/queries', () => ({
  getCurrentUserData: vi.fn().mockResolvedValue({
    membership: { organization: { id: 'orgA' } },
  }),
}))
vi.mock('@/lib/auditoria/actions', () => ({ logAction: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(memberLookupResult),
          }),
        }),
      }),
    }),
    auth: { admin: { updateUserById: (...a: unknown[]) => { updateUserById(...a); return Promise.resolve({ error: null }) } } },
  }),
}))

import { resetColaboradorPassword } from '@/lib/colaboradores/actions'

describe('resetColaboradorPassword — isolamento de tenant (IDOR)', () => {
  beforeEach(() => {
    updateUserById.mockClear()
    memberLookupResult = { data: null }
  })

  it('BLOQUEIA redefinir senha de usuário de outra organização', async () => {
    // alvo não pertence à org do solicitante → member lookup retorna null
    memberLookupResult = { data: null }
    const r = await resetColaboradorPassword('user-de-outra-org')
    expect(r.error).toBe('Colaborador não encontrado.')
    expect(r.newPassword).toBeUndefined()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('PERMITE redefinir senha de usuário da própria organização', async () => {
    memberLookupResult = { data: { id: 'member-1' } }
    const r = await resetColaboradorPassword('user-da-mesma-org')
    expect(r.success).toBeDefined()
    expect(r.newPassword).toBeTruthy()
    expect(updateUserById).toHaveBeenCalledOnce()
  })
})

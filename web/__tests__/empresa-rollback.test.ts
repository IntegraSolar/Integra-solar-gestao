import { describe, it, expect, vi, beforeEach } from 'vitest'

const deleteUser = vi.fn().mockResolvedValue({ error: null })
const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-novo' } }, error: null })
const createOrganizationResources = vi.fn()

vi.mock('@/lib/backoffice/auth/getCurrentPlatformUser', () => ({
  getCurrentPlatformUser: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'super_admin' }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { createUser: (...a: unknown[]) => createUser(...a), deleteUser: (...a: unknown[]) => deleteUser(...a) } } }),
}))
vi.mock('@/lib/org/createOrganization', () => ({
  createOrganizationResources: (...a: unknown[]) => createOrganizationResources(...a),
}))
vi.mock('@/lib/observability', () => ({
  newRequestId: () => 'req0', logStart: vi.fn(), logOk: vi.fn(), reportError: vi.fn(),
}))

import { criarNovaEmpresa } from '@/lib/backoffice/empresas/create-actions'

const input = { company_name: 'Empresa X', full_name: 'Fulano', email: 'a@b.com', password: 'senhaForte1' }

describe('criarNovaEmpresa — rollback transacional', () => {
  beforeEach(() => { deleteUser.mockClear(); createUser.mockClear(); createOrganizationResources.mockReset() })

  it('remove o usuário auth se a criação da organização falhar (sem órfão)', async () => {
    createOrganizationResources.mockRejectedValue(new Error('falha no banco'))
    const r = await criarNovaEmpresa(input)
    expect(r.error).toBeDefined()
    expect(deleteUser).toHaveBeenCalledWith('user-novo')
  })

  it('não remove o usuário quando a criação da organização tem sucesso', async () => {
    createOrganizationResources.mockResolvedValue({ orgId: 'org-novo' })
    const r = await criarNovaEmpresa(input)
    expect(r.success).toBeDefined()
    expect(r.orgId).toBe('org-novo')
    expect(deleteUser).not.toHaveBeenCalled()
  })
})

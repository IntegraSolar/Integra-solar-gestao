import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/backoffice/auth/getCurrentPlatformUser', () => ({
  getCurrentPlatformUser: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'super_admin' }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/org/createOrganization', () => ({ createOrganizationResources: vi.fn() }))
vi.mock('@/lib/observability', () => ({
  newRequestId: () => 'req0',
  logStart: vi.fn(), logOk: vi.fn(), reportError: vi.fn(),
}))

import { criarNovaEmpresa } from '@/lib/backoffice/empresas/create-actions'

describe('criarNovaEmpresa — validação de entrada (Zod)', () => {
  it('rejeita e-mail inválido', async () => {
    const r = await criarNovaEmpresa({ company_name: 'Empresa X', full_name: 'Fulano', email: 'nao-e-email' })
    expect(r.error).toBe('E-mail inválido.')
  })

  it('rejeita nome da empresa vazio', async () => {
    const r = await criarNovaEmpresa({ company_name: '', full_name: 'Fulano', email: 'a@b.com' })
    expect(r.error).toMatch(/empresa/i)
  })

  it('rejeita senha inicial fraca quando informada', async () => {
    const r = await criarNovaEmpresa({ company_name: 'Empresa X', full_name: 'Fulano', email: 'a@b.com', password: '123' })
    expect(r.error).toMatch(/senha/i)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getCurrentUserData = vi.fn()
vi.mock('@/lib/org/queries', () => ({ getCurrentUserData: () => getCurrentUserData() }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error('REDIRECT:' + url) } }))

import { requirePermission, checkPermission, requireModuleAccess } from '@/lib/org/permissions'

const withRole = (role: string, permissions: Record<string, any> = {}) => ({
  membership: { role, permissions, organization: { id: 'orgA' } },
})

describe('permissões — isolamento por papel e módulo', () => {
  beforeEach(() => getCurrentUserData.mockReset())

  it('admin (owner) sempre passa em requirePermission', async () => {
    getCurrentUserData.mockResolvedValue(withRole('owner'))
    await expect(requirePermission('financeiro', 'delete')).resolves.toBeTruthy()
  })

  it('admin passa em checkPermission mesmo sem permissão explícita', async () => {
    getCurrentUserData.mockResolvedValue(withRole('admin'))
    expect(await checkPermission('financeiro', 'export')).toBe(true)
  })

  it('membro COM a permissão passa', async () => {
    getCurrentUserData.mockResolvedValue(withRole('member', { financeiro: { edit: true } }))
    await expect(requirePermission('financeiro', 'edit')).resolves.toBeTruthy()
  })

  it('membro SEM a permissão é bloqueado (lança)', async () => {
    getCurrentUserData.mockResolvedValue(withRole('member', { financeiro: { edit: false } }))
    await expect(requirePermission('financeiro', 'edit')).rejects.toThrow(/Sem permissão/)
  })

  it('membro SEM a permissão retorna false em checkPermission', async () => {
    getCurrentUserData.mockResolvedValue(withRole('member', {}))
    expect(await checkPermission('financeiro', 'edit')).toBe(false)
  })

  it('não autenticado é bloqueado', async () => {
    getCurrentUserData.mockResolvedValue(null)
    await expect(requirePermission('financeiro', 'access')).rejects.toThrow(/Não autenticado/)
    expect(await checkPermission('financeiro', 'access')).toBe(false)
  })

  it('requireModuleAccess redireciona membro sem acesso ao módulo', async () => {
    getCurrentUserData.mockResolvedValue(withRole('member', { financeiro: { access: false } }))
    await expect(requireModuleAccess('financeiro')).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('requireModuleAccess libera admin', async () => {
    getCurrentUserData.mockResolvedValue(withRole('owner'))
    await expect(requireModuleAccess('financeiro')).resolves.toBeTruthy()
  })
})

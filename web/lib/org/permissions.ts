import { redirect } from 'next/navigation'
import { getCurrentUserData, type ModulePermission } from './queries'

const ADMIN_ROLES = ['owner', 'admin'] as const

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

type PermAction = keyof ModulePermission

/**
 * Retorna os dados do usuário se ele tiver a permissão solicitada.
 * Lança erro (pode ser capturado como { error }) se não tiver.
 * Admins (owner/admin) sempre passam.
 */
export async function requirePermission(moduleKey: string, action: PermAction) {
  const user = await getCurrentUserData()
  if (!user?.membership) throw new Error('Não autenticado')

  if (isAdmin(user.membership.role)) return user

  const perm = user.membership.permissions[moduleKey]
  if (!perm?.[action]) {
    throw new Error(`Sem permissão: ${moduleKey}.${action}`)
  }

  return user
}

/**
 * Para uso em Server Components / page.tsx.
 * Redireciona para /dashboard se não tiver acesso ao módulo.
 */
export async function requireModuleAccess(moduleKey: string) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  if (isAdmin(user.membership.role)) return user

  const perm = user.membership.permissions[moduleKey]
  if (!perm?.access) redirect('/dashboard')

  return user
}

/**
 * Verifica permissão sem lançar erro — retorna booleano.
 * Útil em Server Components que precisam condicionar UI.
 */
export async function checkPermission(moduleKey: string, action: PermAction): Promise<boolean> {
  const user = await getCurrentUserData()
  if (!user?.membership) return false
  if (isAdmin(user.membership.role)) return true
  return user.membership.permissions[moduleKey]?.[action] === true
}

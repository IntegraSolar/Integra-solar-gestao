'use client'

import type { CurrentUserData } from '@/lib/org/queries'

const ADMIN_ROLES = ['owner', 'admin'] as const

/**
 * Retorna uma função can(module, action) baseada nos dados do usuário atual.
 * Usar em Client Components onde o user foi passado como prop do Server Component.
 *
 * Exemplo:
 *   const can = usePermission(user)
 *   if (can('financeiro', 'delete')) { ... }
 */
export function usePermission(user: CurrentUserData | null | undefined) {
  return function can(moduleKey: string, action: string): boolean {
    if (!user?.membership) return false
    if (ADMIN_ROLES.includes(user.membership.role as typeof ADMIN_ROLES[number])) return true
    return (user.membership.permissions[moduleKey] as Record<string, boolean> | undefined)?.[action] === true
  }
}

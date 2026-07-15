import { cache } from 'react'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE, type PlatformSession } from './session'

export const getCurrentPlatformUser = cache(async function (): Promise<PlatformSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
})

/**
 * Guard de defesa em profundidade para Server Actions do backoffice.
 * O middleware já protege as rotas /backoffice, mas Server Actions são
 * endpoints POST e não devem confiar apenas no middleware (cf. CVE-2025-29927
 * de bypass de middleware no Next.js). Toda action que usa o admin client
 * (service-role, cross-tenant) deve chamar este guard antes de mutar.
 */
export async function requireBackofficeSession(): Promise<PlatformSession | null> {
  return getCurrentPlatformUser()
}

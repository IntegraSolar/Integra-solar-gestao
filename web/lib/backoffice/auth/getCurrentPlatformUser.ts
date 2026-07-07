import { cache } from 'react'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE, type PlatformSession } from './session'

export const getCurrentPlatformUser = cache(async function (): Promise<PlatformSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
})

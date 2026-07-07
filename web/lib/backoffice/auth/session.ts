// HS256 JWT via Web Crypto API — funciona em Edge Runtime e Node.js

export type PlatformSession = {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'support'
  exp: number
}

export const SESSION_COOKIE = '__bo_session'
export const SESSION_MAX_AGE = 8 * 3600 // 8 horas

const ALG = { name: 'HMAC', hash: 'SHA-256' }

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlToBytes(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return bytes.buffer as ArrayBuffer
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.BACKOFFICE_JWT_SECRET
  if (!secret) throw new Error('BACKOFFICE_JWT_SECRET não configurado')
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALG,
    false,
    ['sign', 'verify']
  )
}

export async function signSession(
  payload: Omit<PlatformSession, 'exp'>
): Promise<string> {
  const key = await getKey()
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, exp })))
  const input = new TextEncoder().encode(`${header}.${body}`)
  const sig = await crypto.subtle.sign(ALG.name, key, input)
  return `${header}.${body}.${b64url(sig)}`
}

export async function verifySession(token: string): Promise<PlatformSession | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const key = await getKey()
    const input = new TextEncoder().encode(`${header}.${body}`)
    const ok = await crypto.subtle.verify(ALG.name, key, b64urlToBytes(sig), input)
    if (!ok) return null
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as PlatformSession
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUBSCRIPTION_BLOCKED_STATUSES } from '@/lib/constants/status'
import { verifySession } from '@/lib/backoffice/auth/session'

const COOKIE_SECRET = process.env.COOKIE_SECRET ?? ''

let _hmacKey: CryptoKey | null = null

async function getHmacKey(): Promise<CryptoKey | null> {
  if (!COOKIE_SECRET) return null
  if (_hmacKey) return _hmacKey
  _hmacKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(COOKIE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  return _hmacKey
}

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function signValue(value: string): Promise<string> {
  const key = await getHmacKey()
  if (!key) return value
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return `${value}.${toBase64url(sig)}`
}

async function verifyAndExtract(signed: string): Promise<string | null> {
  const key = await getHmacKey()
  if (!key) return signed
  const lastDot = signed.lastIndexOf('.')
  if (lastDot === -1) return null
  const value = signed.slice(0, lastDot)
  const sigB64 = signed.slice(lastDot + 1).replace(/-/g, '+').replace(/_/g, '/')
  try {
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0))
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(value))
    return ok ? value : null
  } catch {
    return null
  }
}

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/update-password',
  '/accept-invite',
  '/auth/callback',
  '/api/webhooks',
  '/checkout',
  '/termos',
  '/privacidade',
  '/subscription-expired',
  '/agendar-demo',
  // Portais públicos com acesso por token (segurança via DB, não por sessão)
  '/instalador',
  '/projetista',
  '/cliente',
  '/api/instalador',
  '/api/projetista',
  '/api/cliente',
]

const API_ROUTES_PREFIX = '/api/'

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

async function middlewareHandler(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // ── Branch 1: Backoffice — auth independente do Supabase ──────────
  if (pathname.startsWith('/backoffice')) {
    const isPublic = pathname === '/backoffice/login' || pathname === '/backoffice'
    const token = request.cookies.get('__bo_session')?.value
    const session = token ? await verifySession(token) : null

    if (!session && !isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/backoffice/login'
      return NextResponse.redirect(url)
    }
    if (session && pathname === '/backoffice/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/backoffice/dashboard'
      return NextResponse.redirect(url)
    }
    if (!session && pathname === '/backoffice') {
      const url = request.nextUrl.clone()
      url.pathname = '/backoffice/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Rotas públicas não precisam de verificação Supabase — retorna direto.
  // (Usuário autenticado em /login vai ao dashboard após o form redirect, não antes.)
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request })
  }

  // Rota raiz sem cookie de sessão → landing ou login, sem chamar Supabase
  if (pathname === '/') {
    const hasSession = request.cookies.getAll().some(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )
    if (!hasSession) return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  // Rota raiz com sessão → redireciona ao dashboard
  if (pathname === '/') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Usuário não autenticado tentando acessar rota protegida
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Verificar subscription para rotas protegidas do dashboard (não APIs)
  if (user && !isPublicRoute(pathname) && !pathname.startsWith(API_ROUTES_PREFIX)) {
    const SUB_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos
    const SUB_CACHE_COOKIE = 'sub_cache'

    let isBlocked = false

    // Verificar cache antes de ir ao DB
    const rawCached = request.cookies.get(SUB_CACHE_COOKIE)?.value
    const cached = rawCached ? await verifyAndExtract(rawCached) : null
    let cacheHit = false

    if (cached) {
      try {
        const { status, expiresAt, cachedAt } = JSON.parse(cached)
        if (Date.now() - cachedAt < SUB_CACHE_TTL_MS) {
          cacheHit = true
          const expired = expiresAt && new Date(expiresAt) < new Date()
          isBlocked = SUBSCRIPTION_BLOCKED_STATUSES.includes(status) || expired
        }
      } catch {
        // Cache corrompido ou assinatura inválida — será sobrescrito na próxima consulta ao DB
        if (process.env.NODE_ENV !== 'production') console.warn('[middleware] sub_cache inválido ou corrompido')
      }
    }

    if (!cacheHit) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscription) {
        const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date()
        isBlocked = SUBSCRIPTION_BLOCKED_STATUSES.includes(subscription.status as any) || !!isExpired

        // Gravar no cookie de cache (assinado com HMAC)
        const cachePayload = JSON.stringify({
          status: subscription.status,
          expiresAt: subscription.expires_at,
          cachedAt: Date.now(),
        })
        const cacheValue = await signValue(cachePayload)
        supabaseResponse.cookies.set(SUB_CACHE_COOKIE, cacheValue, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: Math.floor(SUB_CACHE_TTL_MS / 1000),
        })
      }
    }

    if (isBlocked && pathname !== '/subscription-expired') {
      const url = request.nextUrl.clone()
      url.pathname = '/subscription-expired'
      return NextResponse.redirect(url)
    }
    // Se não tem subscription (usuário antigo/owner original), permite acesso
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    return await middlewareHandler(request)
  } catch (err) {
    console.error('[middleware] erro não tratado:', err)
    const { pathname } = request.nextUrl
    // Rotas públicas: permite passar mesmo com erro
    if (isPublicRoute(pathname) || pathname === '/') {
      return NextResponse.next()
    }
    // Rotas protegidas: redireciona para login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

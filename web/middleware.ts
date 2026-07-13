import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/backoffice/auth/session'

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

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

// Verifica presença do cookie de sessão Supabase sem chamada de rede.
// A validação real do JWT ocorre nos Server Components (Node.js runtime).
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    ({ name, value }) => name.includes('-auth-token') && value.length > 0
  )
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

  // ── Branch 2: Rotas públicas ───────────────────────────────────────
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request })
  }

  // ── Branch 3: Rota raiz ────────────────────────────────────────────
  if (pathname === '/') {
    if (hasSessionCookie(request)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  // ── Branch 4: Rotas protegidas ────────────────────────────────────
  if (!hasSessionCookie(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    return await middlewareHandler(request)
  } catch (err) {
    console.error('[middleware] erro não tratado:', err)
    const { pathname } = request.nextUrl
    if (isPublicRoute(pathname) || pathname === '/') {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webpo)$).*)',
  ],
}

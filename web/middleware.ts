import { createServerClient } from '@supabase/ssr'
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
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request })
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

  // getSession() lê o JWT do cookie localmente — sem chamada de rede ao Supabase.
  // Evita timeout no Edge Runtime. A validação real ocorre nos Server Components.
  let user = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  } catch {
    user = null
  }

  // Rota raiz → redireciona usuário autenticado ao dashboard
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

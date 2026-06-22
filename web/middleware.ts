import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
]

const API_ROUTES_PREFIX = '/api/'

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rota raiz → only redirect if authenticated
  if (pathname === '/') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Usuário não autenticado tentando acessar rota protegida
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Usuário autenticado tentando acessar página de login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Verificar subscription para rotas protegidas do dashboard (não APIs)
  if (user && !isPublicRoute(pathname) && !pathname.startsWith(API_ROUTES_PREFIX)) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscription) {
      const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date()
      const blockedStatuses = ['expired', 'canceled', 'overdue', 'unpaid']

      if (blockedStatuses.includes(subscription.status) || isExpired) {
        if (pathname !== '/subscription-expired') {
          const url = request.nextUrl.clone()
          url.pathname = '/subscription-expired'
          return NextResponse.redirect(url)
        }
      }
    }
    // Se não tem subscription (usuário antigo/owner original), permite acesso
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

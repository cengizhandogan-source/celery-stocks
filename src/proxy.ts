import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '/search' || pathname === '/login' || pathname === '/signup' || pathname === '/check-email') {
    return true;
  }
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/profile/') || pathname.startsWith('/post/')) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname, search, hash } = request.nextUrl

  // Backwards-compat: redirect any legacy /social/* URL to the stripped path.
  if (pathname === '/social' || pathname.startsWith('/social/')) {
    const stripped = pathname.replace(/^\/social/, '') || '/'
    return NextResponse.redirect(new URL(stripped + search + hash, request.url), 308)
  }

  const { supabaseResponse, user } = await updateSession(request)

  const isAuthPage = pathname === '/login'

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|llms\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

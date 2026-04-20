import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/social' || pathname === '/social/search' || pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return true;
  }
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/social/profile/') || pathname.startsWith('/social/post/')) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login'

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/social', request.url))
  }

  if (isPublicRoute(path)) {
    return supabaseResponse
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|llms\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

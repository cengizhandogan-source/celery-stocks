import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/social', '/social/search', '/commands', '/api/', '/auth/'];

function isPublicRoute(pathname: string): boolean {
  // Exact matches
  if (pathname === '/social' || pathname === '/social/search' || pathname === '/' || pathname === '/login' || pathname === '/commands') {
    return true;
  }
  // Prefix matches for API, auth, and public profile viewing
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/social/profile/')) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login'

  // Redirect authenticated users away from login page
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/social', request.url))
  }

  // Allow public routes without auth
  if (isPublicRoute(path)) {
    return supabaseResponse
  }

  // Protected routes: redirect to login with redirectTo param
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

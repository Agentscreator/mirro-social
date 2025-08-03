import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  
  // Detect mobile app environments
  const isMobileApp = 
    userAgent.includes('ReactNative') ||
    userAgent.includes('Expo') ||
    userAgent.includes('CapacitorWebView') ||
    userAgent.includes('Cordova') ||
    userAgent.includes('PhoneGap') ||
    userAgent.includes('Flutter') ||
    userAgent.includes('MirroApp') ||
    userAgent.includes('MirroMobile') ||
    request.nextUrl.searchParams.get('app') === 'mobile' ||
    request.nextUrl.searchParams.get('mode') === 'app'

  // Handle mobile app routing - bypass landing page
  if (request.nextUrl.pathname === '/' && isMobileApp) {
    try {
      // Check if user is authenticated
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (token) {
        // User is authenticated, redirect to feed
        return NextResponse.redirect(new URL('/feed', request.url))
      } else {
        // User is not authenticated, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
      }
    } catch (error) {
      console.error('Middleware auth check failed:', error)
      // On error, redirect to login for safety
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Handle web app routing - allow landing page for web users
  // Web users can visit the landing page normally

  // Protected routes - require authentication
  const protectedPaths = ['/feed', '/discover', '/messages', '/profile', '/albums', '/settings']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        // Not authenticated, redirect to login
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
    } catch (error) {
      console.error('Middleware auth check failed:', error)
      // On error, redirect to login for safety
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Auth routes - redirect if already authenticated
  const authPaths = ['/login', '/signup', '/reset-password']
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath) {
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (token) {
        // Already authenticated, redirect to feed
        return NextResponse.redirect(new URL('/feed', request.url))
      }
    } catch (error) {
      console.error('Middleware auth check failed:', error)
      // On error, continue to auth page
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}
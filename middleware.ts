import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  console.log('🛡️ Middleware processing:', request.nextUrl.pathname, 'UA:', userAgent.substring(0, 100) + '...')
  
  // Enhanced mobile app detection
  const mobileAppIndicators = [
    'wv', // WebView indicator
    'ReactNative',
    'Expo', 
    'CapacitorWebView',
    'Cordova',
    'PhoneGap',
    'Flutter',
    'MirroApp',
    'MirroMobile',
    'Mobile/',
    /Android.*wv/i // Android WebView regex
  ];
  
  const isMobileApp = 
    mobileAppIndicators.some(indicator => 
      typeof indicator === 'string' 
        ? userAgent.includes(indicator)
        : indicator.test(userAgent)
    ) ||
    request.nextUrl.searchParams.get('app') === 'mobile' ||
    request.nextUrl.searchParams.get('mode') === 'app'
  
  console.log('🔍 Mobile app detected:', isMobileApp)

  // Handle mobile app routing - allow first-time users to see landing page
  if (request.nextUrl.pathname === '/' && isMobileApp) {
    try {
      console.log('🔐 Checking mobile app authentication...')
      
      // Validate NEXTAUTH_SECRET exists
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('❌ NEXTAUTH_SECRET not found in environment variables')
        return NextResponse.redirect(new URL('/login?error=config', request.url))
      }
      
      // Check if user is authenticated
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (token) {
        console.log('✅ Mobile user authenticated, redirecting to feed')
        return NextResponse.redirect(new URL('/feed', request.url))
      } else {
        // For unauthenticated mobile users, let the client-side handle first-time vs returning user logic
        console.log('❌ Mobile user not authenticated, allowing landing page (client will handle redirect)')
        // Don't redirect here - let MobileAppRedirect component handle it
      }
    } catch (error) {
      console.error('❌ Middleware mobile auth check failed:', error)
      // On error, redirect to login for safety with error indicator
      return NextResponse.redirect(new URL('/login?error=middleware', request.url))
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
      console.log('🔐 Checking protected route authentication for:', request.nextUrl.pathname)
      
      // Validate NEXTAUTH_SECRET exists
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('❌ NEXTAUTH_SECRET not found for protected route')
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'config')
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        console.log('❌ No valid token for protected route, redirecting to login')
        // Not authenticated, redirect to login
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      } else {
        console.log('✅ Valid token found for protected route')
      }
    } catch (error) {
      console.error('❌ Middleware protected route auth check failed:', error)
      // On error, redirect to login for safety
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'middleware')
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
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export function MobileAppRedirect() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Detect if running in a mobile app environment
    const isMobileApp = () => {
      // Check for common mobile app user agents
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''
      
      // Check for React Native / Expo
      if (userAgent.includes('ReactNative') || userAgent.includes('Expo')) {
        return true
      }
      
      // Check for Capacitor (Ionic)
      if (userAgent.includes('CapacitorWebView')) {
        return true
      }
      
      // Check for Cordova/PhoneGap
      if (userAgent.includes('Cordova') || userAgent.includes('PhoneGap')) {
        return true
      }
      
      // Check for Flutter WebView
      if (userAgent.includes('Flutter')) {
        return true
      }
      
      // Check for custom app identifiers
      if (userAgent.includes('MirroApp') || userAgent.includes('MirroMobile')) {
        return true
      }
      
      // Check for standalone mode (PWA installed)
      if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
        return true
      }
      
      // Check for app mode in URL parameters
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('app') === 'mobile' || urlParams.get('mode') === 'app') {
          return true
        }
      }
      
      return false
    }

    // Only redirect if we're in a mobile app - don't interfere with web users
    if (isMobileApp()) {
      if (status === 'loading') {
        // Still checking authentication, wait
        return
      }
      
      if (session) {
        // User is authenticated, redirect to main app
        router.replace('/feed')
      } else {
        // User is not authenticated - check if they've seen the app before
        const hasSeenApp = localStorage.getItem('mirro_app_visited')
        
        if (hasSeenApp) {
          // Returning user without session, go to login
          router.replace('/login')
        } else {
          // First-time user, go directly to signup
          localStorage.setItem('mirro_app_visited', 'true')
          router.replace('/signup')
        }
      }
    }
    // For web users: do nothing, let them see the landing page normally
  }, [session, status, router])

  // Don't render anything, this is just for redirection
  return null
}
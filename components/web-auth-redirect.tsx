"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect } from "react"

export function WebAuthRedirect() {
  const { data: session, status } = useSession()

  useEffect(() => {
    // Check if mobile app (don't interfere with mobile apps)
    const isMobileApp = () => {
      if (typeof window === 'undefined') return false
      
      const userAgent = window.navigator.userAgent
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
      ]
      
      return mobileAppIndicators.some(indicator => 
        typeof indicator === 'string' 
          ? userAgent.includes(indicator)
          : indicator.test(userAgent)
      ) ||
      window.matchMedia('(display-mode: standalone)').matches ||
      new URLSearchParams(window.location.search).get('app') === 'mobile'
    }

    // For web users only: clear session if they're on the landing page
    // This ensures web users always go through fresh login
    if (!isMobileApp() && session && window.location.pathname === '/') {
      console.log('🌐 Web user detected on landing page, clearing session for fresh login')
      signOut({ 
        redirect: false,
        callbackUrl: '/' 
      }).then(() => {
        // Clear any local storage tokens as well
        try {
          localStorage.removeItem('mirro_auth_token')
          localStorage.removeItem('next-auth.session-token')
          localStorage.removeItem('__Secure-next-auth.session-token')
          console.log('✅ Web session cleared successfully')
        } catch (error) {
          console.error('Error clearing local storage:', error)
        }
      })
    }
  }, [session])

  // Don't render anything - this component just handles session logic
  return null
}